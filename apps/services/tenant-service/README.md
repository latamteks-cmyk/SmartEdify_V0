# Tenant Service (Fase 0)

Responsable de: tenants (condominios), unidades, memberships (owner/renter/family), posiciones de gobernanza (admin/presidente/vicepresidente/tesorero) y políticas básicas.

## Objetivos Fase 0
Estado actual (progreso alcanzado):
1. Contrato OpenAPI v0.1 definido en `api/openapi/tenant.yaml`.
2. Esquema relacional inicial + constraints críticos: unicidad admin (partial unique) y no solapamiento renter/owner (exclusion gist) implementados.
3. Migraciones creadas: `202509141200_init.sql` y `202509141230_overlap_constraints.sql`.

Pendiente dentro de Fase 0:
4. Optimización gauge memberships (evitar COUNT completo más adelante con materialización incremental).
5. Tests de integración iniciales (creación tenant, unidad, membership, transferencia admin conflicto/success).
6. Cache `/tenant-context` (TTL + invalidación) y persistencia de versión hash (hoy cálculo in-memory por petición).
7. Especificar contrato eventos y añadir firma/hash chain (fase posterior).

## Endpoints (v0.1)
Implementados (persistencia Postgres para entidades principales):
- POST /tenants
- GET /tenants/{id}
- POST /tenants/{id}/units
- GET /tenants/{id}/units
- POST /units/{id}/memberships
- POST /tenants/{id}/governance/transfer-admin (stub siempre success)
- GET /tenant-context (roles combinados + versión hash calculada al vuelo)

Stub 501 (no implementado aún):
- POST /tenants/{id}/governance/delegate

## Variables de Entorno (draft)
TENANT_DB_URL=postgres://user:pass@host:5432/tenant
TENANT_LOG_LEVEL=info
TENANT_OUTBOX_POLL_INTERVAL_MS=500
TENANT_OUTBOX_BATCH_SIZE=50
TENANT_CONTEXT_CACHE_TTL_MS=60000
OUTBOX_MAX_PAYLOAD_BYTES=65536

## Ejecución Local

Instalación dependencias y arranque en modo desarrollo (watch):

```bash
cd apps/services/tenant-service
npm install
npm run dev
```

Variables: copiar `.env.example` a `.env` y ajustar `TENANT_DB_URL` (ahora requerido para repos Postgres en runtime).

Build y ejecución compilada:

```bash
npm run build
npm start
```

## Métricas Iniciales (definición)
Actual (Fase 0 + Operability Addendum):

| Nombre | Tipo | Labels | Descripción |
|--------|------|--------|-------------|
| tenant_created_total | counter | - | Tenants creados |
| unit_created_total | counter | - | Unidades creadas |
| membership_active | gauge | - | Memberships activas (instantáneo) |
| governance_transfer_total | counter | result=success|conflict | Transferencias admin (idempotente cuenta como success) |
| outbox_published_total | counter | - | Eventos marcados published |
| outbox_publish_failed_total | counter | - | Errores al publicar (placeholder publisher) |
| outbox_publish_attempts_total | counter | - | Intentos totales (éxito + fallo) |
| outbox_retry_total | counter | - | Reintentos temporales programados |
| outbox_failed_permanent_total | counter | - | Eventos movidos a estado failed_permanent |
| outbox_reprocessed_total | counter | - | Eventos recuperados desde DLQ |
| outbox_pending | gauge | - | Eventos pendientes (no publicados) |
| outbox_dlq_size | gauge | - | Eventos presentes en DLQ |
| outbox_event_age_seconds | histogram | - | Edad eventos pending muestreados (creado→tick) |
| outbox_dlq_purged_total | counter | - | Eventos eliminados vía purga DLQ |
| outbox_publish_latency_seconds | histogram | - | Latencia creación→publicado |
| outbox_validation_failed_total | counter | reason | Eventos descartados antes de publicar (schema/payload_size/payload_serialize) |
| broker_publisher_health | gauge | - | 1 si publisher operativo, 0 si caído |
| broker_publisher_connect_fail_total | counter | - | Fallos al establecer conexión inicial con broker |
| broker_consumer_lag | gauge | topic,partition | Lag (logEndOffset - committedOffset) por partición |
| broker_consumer_lag_max | gauge | - | Lag máximo observado entre particiones |
| broker_consumer_lag_poll_failed_total | counter | - | Fallos al obtener offsets para calcular lag |

Uso: GET `/metrics` (Prometheus exposition format).

Recomendado definir alertas posteriores (no incluidas aún):
```
ALERT OutboxDLQGrowth IF increase(outbox_dlq_size[10m]) > 25
ALERT OutboxEventStaleP95 IF histogram_quantile(0.95, sum(rate(outbox_event_age_seconds_bucket[5m])) by (le)) > 120
```

## Ciclo de Vida Outbox

```
 pending --(publish OK)--> published
 pending --(error transitorio + retries)--> pending (retry_count++)
 pending --(excede maxRetries)--> failed_permanent + copia → DLQ
 DLQ --(POST /outbox/dlq/{id}/reprocess)--> pending (reset counters / errores)
 DLQ --(DELETE /outbox/dlq?olderThan=...)--> purgado (no recuperable)
```

Campos clave:
- retry_count: incrementa en fallos temporales
- next_retry_at: gating de reintentos
- last_error: truncado a 500 chars
- outbox_events_dlq.failed_at: timestamp para retención / purga

## Runbooks Operativos

### 1. Backlog alto (outbox_pending crece)
1. Verificar errores recientes en logs (filtrar "outbox tick error").
2. Consultar histogramas: `outbox_event_age_seconds` p95.
3. Si publish_failed_total / attempts_total ratio > 0.2 en 5m → investigar conectividad (DB, broker futuro).
4. Mitigación temporal: reducir batchSize para suavizar picos o pausar poller si se requiere inspección manual.

SQL apoyo:
```sql
-- Top 10 eventos más antiguos pendientes
SELECT id, type, created_at, retry_count
FROM outbox_events
WHERE status='pending' AND published_at IS NULL
ORDER BY created_at ASC
LIMIT 10;
```

### 2. Crecimiento DLQ
1. Observar `outbox_dlq_size` y listar vía GET `/outbox/dlq?limit=100`.
2. Agrupar por tipo para ver patrones:
```sql
SELECT type, count(*)
FROM outbox_events_dlq
GROUP BY type
ORDER BY 2 DESC;
```
3. Revisar `last_error` para causa raíz.
4. Reprocesar eventos individuales si la causa fue transitoria: `POST /outbox/dlq/{id}/reprocess`.
5. Si causa es semántica (datos inválidos), evaluar proceso de corrección antes de reprocess.

### 3. Purga DLQ (retención)
Objetivo: mantener DLQ bajo (ej. < 50 eventos y antigüedad < 7d).

Acción:
```
DELETE /outbox/dlq?olderThan=2025-09-01T00:00:00Z
```
Resultado: incrementa `outbox_dlq_purged_total`.

Verificación:
```
curl :/metrics | grep outbox_dlq_size
```

### 4. Reprocess masivo (manual temporal)
Mientras no exista endpoint batch, puede hacerse en bucle:
```bash
curl -s "http://localhost:3000/outbox/dlq?limit=500" | jq -r '.items[].id' | while read id; do
	curl -s -X POST "http://localhost:3000/outbox/dlq/$id/reprocess";
done
```
Chequeo post:
```
curl :/metrics | grep outbox_reprocessed_total
```

### 5. Diagnóstico de latencia publication
Si `outbox_publish_latency_seconds` p95 > objetivo:
1. Confirmar ausencia de locks prolongados en DB.
2. Revisar GC / event loop (Node) si se integra broker real.
3. Segmentar por tipo de evento (añadir label futuro en histogram si aplica).

## Próxima Fase (Broker / Publisher Abstraction)
Preparar interface `Publisher.publish(event)` con implementación stub vs real (Kafka/NATS). Incorporar métricas: `broker_publish_failed_total`, `broker_lag_seconds` (consumer side) y `outbox_inflight`.

Referencias: ver sección "Fase 1" en `docs/roadmap.md`.

## Publisher / Broker Abstraction (Fase 1 - Implementación Inicial)

### Objetivo
Desacoplar la producción de eventos (outbox) del mecanismo de transporte subyacente (Kafka/NATS/JetStream) mediante una interfaz estable y testeable.

### Interface
`publisher.ts`:
```ts
export interface Publisher {
	publish(ev: OutboxEnvelope): Promise<{ ok: boolean; error?: any }>;
	shutdown?(): Promise<void>;
}
```

### Estrategia de Evolución
1. LoggingPublisher (actual): éxito inmediato y métricas broker incrementadas.
2. KafkaPublisher (próximo): produce con clave = `aggregateId` para orden por agregado.
3. Resiliencia: backpressure → si broker no disponible, confiar en retries outbox; NO perder eventos.

### Métricas Broker (añadidas)
| Métrica | Descripción |
|---------|-------------|
| broker_publish_total | Publicaciones confirmadas por el publisher |
| broker_publish_failed_total | Intentos fallidos (previo al retry outbox) |

Próximas (no implementadas aún): `broker_lag_seconds`, `broker_inflight`.

### Validación de Envelope (Nueva)
Antes de publicar se valida:
1. Estructura básica (UUID, strings no vacíos, versiones >=1).
2. Serialización JSON del payload.
3. Tamaño serializado (`OUTBOX_MAX_PAYLOAD_BYTES`, default 64KB).

Si falla → evento se marca `failed_permanent` y se mueve a DLQ; métrica `outbox_validation_failed_total{reason}` incrementa (reasons: `schema`, `payload_size`, `payload_serialize`).

### Health Endpoint
`GET /health` devuelve:
```
{
	"status": "ok|degraded",
	"checks": {
		"db": { "ok": true },
		"publisher": { "ok": true }
	}
}
```
El gauge `broker_publisher_health` se actualiza (1=up,0=down). Fallos de conexión inicial incrementan `broker_publisher_connect_fail_total`.

### Consumer Lag (Inicial)
Variables nuevas:
```
TENANT_CONSUMER=none|logging|kafka   (default none)
KAFKA_CONSUMER_GROUP_ID=tenant-service-consumer
KAFKA_CONSUMER_LAG_INTERVAL_MS=10000
```
Cuando `TENANT_CONSUMER=kafka` y hay brokers, se calcula periódicamente el lag por tema y partición filtrando por prefijo `<KAFKA_TOPIC_PREFIX>.`.

Métricas:
- `broker_consumer_lag{topic,partition}`
- `broker_consumer_lag_max`
- `broker_consumer_lag_poll_failed_total`

Nota: todavía no se procesan mensajes (no hay handlers), sólo observabilidad de backlog para capacity planning y verificación de publicación.

### Futuro (Consumo / Proyecciones)
Se añadirá un consumer service separado que consumirá tópicos y actualizará proyecciones derivadas.

### Configuración Broker (Kafka)

Variables de entorno:
```
TENANT_PUBLISHER=kafka              # (logging|kafka) - default logging
KAFKA_BROKERS=localhost:9092        # Comma-separated
KAFKA_CLIENT_ID=tenant-service
KAFKA_TOPIC_PREFIX=tenant           # Prefijo para <prefix>.<aggregateType>
KAFKA_ACKS=-1                       # -1=all, 1=leader, 0=fire-and-forget
```

Fallback: si `TENANT_PUBLISHER=kafka` pero `KAFKA_BROKERS` está vacío → se usa `LoggingPublisher` y se loguea warn.

Métricas adicionales (Kafka activo):
- `broker_publish_latency_seconds`
- `broker_payload_bytes_total`

Convención de tópicos:
`<KAFKA_TOPIC_PREFIX>.<aggregateType>` (ej: `tenant.tenant`, `tenant.unit`).

Partition Key: `aggregateId` (o `partitionKey` si se establece en el envelope) para mantener orden por agregado.

## Próximas Fases
Ver `docs/roadmap.md` (Fase 1–5).

## Notas
- JWT no se emite aquí; sólo contexto.
- Claims: se recomienda incluir `tenant_ctx_version` desde Auth tras consumir /tenant-context.
- Se prioriza idempotencia vía `Idempotency-Key`/`x-request-id` (a documentar) para creación de tenants.
 - Repos Postgres activos (Pool, mapeos y manejo de error `admin_conflict`).
 - Outbox activa con poller interno (simulación de publicación por logging) y métricas asociadas.
 - Runbooks operativos agregados (ver secciones: Backlog, DLQ, Purga, Reprocess, Latencia).
