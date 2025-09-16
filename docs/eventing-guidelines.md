# Guía de eventos (NATS)

## Convenciones de nombres
- Subjects con formato `v<version>.<dominio>.<agregado>.<accion>` para facilitar filtros con comodines (`v1.ventas.orden.*`).
- Dominios y agregados en inglés en singular (`billing.invoice`), acciones en pasado (`created`, `updated`).
- Identificadores de actores (`actor_id`, `tenant_id`) siempre en snake_case y UUID v4 salvo proveedores externos.
- El `event_id` es un UUID v7 y se usa como *deduplication key* en consumidores idempotentes.

## Versionado de subjects y payloads
- Incrementar la versión del subject cuando el *payload* cambia de forma incompatible (p. ej. campos renombrados o eliminados).
- Los cambios compatibles (añadir campos opcionales) mantienen la versión y se documentan en el registro de esquemas.
- Mantener vivas al menos dos versiones durante la migración; los productores publican en ambas y los consumidores actualizan primero.

## Estructura del evento
- `data` debe ser un objeto con `id`, `occurred_at`, `actor`, `tenant_id` y `payload`.
- `occurred_at` en ISO8601 con zona UTC (`2024-03-15T12:34:56Z`).
- `payload` encapsula el dominio del evento y nunca expone PII sin clasificación previa.
- Ejemplo:

```json
{
  "subject": "v1.billing.invoice.created",
  "event_id": "018f1c90-d64a-72c2-8dd6-71a9e1d2e220",
  "occurred_at": "2024-03-15T12:34:56Z",
  "actor": {"id": "7c38...", "type": "system"},
  "tenant_id": "8b3f...",
  "data": {
    "id": "inv-10293",
    "occurred_at": "2024-03-15T12:34:56Z",
    "actor": {"id": "7c38...", "type": "system"},
    "tenant_id": "8b3f...",
    "payload": {
      "number": "INV-2024-001",
      "total": 199.99,
      "currency": "USD"
    }
  }
}
```

## Validación de esquemas
- Cada subject tiene un JSON Schema almacenado en `specs/events/<dominio>/<subject>.schema.json` versionado en Git.
- Los productores validan el payload antes de publicar usando AJV (Node) o `jsonschema` (Python).
- Los consumidores ejecutan *contract tests* contra el mismo schema y rechazan mensajes que no validan.
- Los *pipelines* de CI ejecutan `npm run lint:events` para validar esquemas y diffs.

## Manejo de errores y DLQ
- En caso de validación fallida, emitir `nack` y registrar el `event_id` + motivo en observabilidad (Log + Trace).
- Retentar con *backoff* exponencial con *jitter* hasta 5 veces antes de enrutar a `dlq.<servicio>`.
- Documentar un *runbook* por cola DLQ con pasos para reprocesar (`nats stream replay ...`).
- Ejemplo de flujo de manejo de error:
  1. Consumidor recibe `v1.billing.invoice.created` y falla validación.
  2. Envía `nack`, registra métrica `events.validation_error` con etiquetas `subject`, `tenant_id`.
  3. Tras 5 intentos, se publica en `dlq.billing` y se abre alerta en PagerDuty.
  4. Operaciones usa el runbook para corregir datos y reprocesar el evento.
