# Auth Service

Servicio de autenticación y emisión de tokens de SmartEdify. Implementado en Node.js/TypeScript con Express, PostgreSQL, Redis, Argon2id y rotación de claves JWT basada en JWKS.

## Arquitectura rápida
- **API HTTP**: Express 4 + DTOs validados con Zod.
- **Persistencia**: PostgreSQL (`users`, `user_roles`, `audit_security`, `auth_signing_keys`).
- **Cache / control**: Redis para sesiones, revocación de tokens, rate limiting y guardas contra fuerza bruta.
- **Seguridad**: Argon2id parametrizable, JWT RS256 con JWKS rotativo y detección de reuse de refresh tokens.
- **Observabilidad**: logs JSON Pino/Pino-http, métricas Prometheus y trazas OpenTelemetry.

## Requisitos previos
- Node.js ≥ 18.
- PostgreSQL 15 y Redis 7 (puedes usar `docker compose up -d db redis` desde la raíz del monorepo).
- Archivo `.env` en la raíz del repo basado en `.env.example` para cargar puertos y credenciales.

## Setup rápido (desarrollo)
```bash
cd apps/services/auth-service
npm install
npm run migrate           # aplica migraciones desde migrations_clean/
npm run dev               # arranca con ts-node + nodemon
```

Producción / ejecución compilada:
```bash
npm run build
npm start
```

## Scripts npm útiles
| Comando | Descripción |
|---------|-------------|
| `npm run migrate` | Ejecuta migraciones forward-only (`migrations_clean/`) con `node-pg-migrate`. |
| `npm run migrate:create -- <slug>` | Crea nueva migración timestamped en `migrations_clean/`. |
| `npm test` | Ejecuta la suite Jest multiproyecto (`security`, `integration`, `unit`) in-band. |
| `npm run test:proj:integration` | Sólo pruebas de integración contra Postgres/Redis reales. |
| `npm run test:proj:security` | Sólo pruebas de rotación de claves/JWT. |
| `npm run lint` / `npm run format` | ESLint + Prettier. |

## Endpoints expuestos
- `POST /register`
- `POST /login`
- `POST /logout`
- `POST /forgot-password`
- `POST /reset-password`
- `POST /refresh-token` (rotación con detección de reuse)
- `GET /roles`
- `GET /permissions`
- `GET /health`
- `GET /metrics`
- `GET /.well-known/jwks.json`
- `POST /admin/rotate-keys` *(MVP sin autenticación; proteger en producción)*
- `GET /debug/current-kid` *(sólo entornos `NODE_ENV !== 'production'`)*

## Variables de entorno
### PostgreSQL / Redis
| Variable | Descripción | Default |
|----------|-------------|---------|
| `PGHOST` | Host de PostgreSQL | `localhost` |
| `PGPORT` | Puerto PostgreSQL | `5432` |
| `PGUSER` | Usuario PostgreSQL | `postgres` |
| `PGPASSWORD` | Password PostgreSQL | `postgres` |
| `PGDATABASE` | Base de datos | `smartedify` |
| `REDIS_HOST` | Host Redis | `localhost` |
| `REDIS_PORT` | Puerto Redis | `6379` |

### HTTP / logging / tracing
| Variable | Descripción | Default |
|----------|-------------|---------|
| `AUTH_PORT` | Puerto HTTP del servicio | `8080` |
| `AUTH_LOG_LEVEL` | Nivel de logs Pino (`fatal`→`trace`) | `info` |
| `AUTH_SERVICE_NAME` | Nombre de recurso para OTel | `auth-service` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` / `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` | Endpoint collector OTLP | `http://localhost:4318` |

### Seguridad y hashing
| Variable | Descripción | Default |
|----------|-------------|---------|
| `AUTH_JWT_ACCESS_TTL` | TTL access token (acepta sufijos s/m/h/d) | `900s` |
| `AUTH_JWT_REFRESH_TTL` | TTL refresh token | `30d` |
| `AUTH_JWT_ACCESS_SECRET` / `AUTH_JWT_REFRESH_SECRET` | Fallback legacy si no hay JWKS (mantener vacías en producción) | `` |
| `AUTH_ARGON2_MEMORY_KIB` | Memoria Argon2id | `19456` (4096 en tests) |
| `AUTH_ARGON2_ITERATIONS` | Iteraciones Argon2id | `3` (2 en tests) |
| `AUTH_ARGON2_PARALLELISM` | Paralelismo Argon2id | `1` |

### Rate limiting y protección fuerza bruta
| Variable | Descripción | Default |
|----------|-------------|---------|
| `AUTH_LOGIN_WINDOW_MS` | Ventana rate-limit login | `60000` |
| `AUTH_LOGIN_MAX_ATTEMPTS` | Intentos permitidos en ventana | `10` |
| `AUTH_BRUTE_WINDOW_SEC` | TTL guardia fuerza bruta (Redis) | `300` |
| `AUTH_BRUTE_MAX_ATTEMPTS` | Intentos totales antes de bloqueo | `20` |

### Depuración / pruebas
| Variable | Descripción |
|----------|-------------|
| `AUTH_TEST_LOGS` | Si está definida, habilita logs en tests (pino suprimido por defecto). |
| `DEBUG_REFRESH` | Traza verbose de rotación `refresh-token`. |

## Métricas Prometheus
Registradas en `/metrics`:

| Métrica | Tipo | Descripción |
|---------|------|-------------|
| `auth_http_requests_total{method,route,status}` | Counter | Total de requests HTTP. |
| `auth_http_request_duration_seconds` | Histogram | Latencia por ruta/status. |
| `auth_login_success_total` | Counter | Logins exitosos. |
| `auth_login_fail_total` | Counter | Logins rechazados (credenciales inválidas). |
| `auth_password_reset_requested_total` | Counter | Solicitudes de recuperación enviadas. |
| `auth_password_reset_completed_total` | Counter | Resets completados. |
| `auth_refresh_rotated_total` | Counter | Rotaciones exitosas de refresh token. |
| `auth_refresh_reuse_blocked_total` | Counter | Intentos de reuso detectados. |
| `auth_jwks_keys_total{status}` | Gauge | Número de claves por estado (`current`, `next`, `retiring`). |
| `auth_jwks_rotation_total` | Counter | Rotaciones manuales ejecutadas. |

## Rotación JWKS y tokens
- Las claves se almacenan en `auth_signing_keys` con estados `current`, `next`, `retiring`, `expired`.
- Al inicializar si no existe `current`, se genera automáticamente.
- Endpoint `POST /admin/rotate-keys` ejecuta el flujo MVP: `current → retiring`, `next → current`, crea nueva `next`.
- `/.well-known/jwks.json` expone claves públicas para gateways/servicios; actualiza métricas `auth_jwks_keys_total`.
- Fallback legacy (`AUTH_JWT_*_SECRET`) sólo se usa si llega un token sin `kid`.
- Refresh tokens almacenan `jti` en Redis (`refresh:<jti>`); al rotarlos se revoca el anterior y se marca en `rotated:` + lista de revocación.

## Redis & listas de control
- Rate limiting login: `rate:<ip>` y guardia fuerza bruta `bf:<email>:<ip>` con TTL configurable.
- Sesiones/refresh/reset tokens viven en namespaces `session:*`, `refresh:*`, `pwdreset:*`.
- Lista de revocación (`revoked:*`) y set de refresh rotados (`rotated:*`) evitan reuse.
- En tests Jest se usa mock de `ioredis` (in-memory) con stores dedicados.

## Observabilidad
- Logs estructurados Pino con `x-request-id`, `trace_id`, `span_id` cuando hay span activo.
- OpenTelemetry (`@opentelemetry/sdk-node`) auto-instrumenta HTTP, Express y PostgreSQL; configura `OTEL_EXPORTER_OTLP_*` según collector.
- Health check `/health` consulta PostgreSQL y Redis e informa `status=ok|degraded`.

## Pruebas
La configuración Jest multiproyecto vive en `jest.config.js`:
- **security**: rotación JWKS, validación `kid`, reuse refresh tokens.
- **integration**: flujos completos contra Postgres real (`global-setup` aplica migraciones y prepara Redis mock/real).
- **unit**: lógica pura y helpers.

Comandos clave:
```bash
npm run test:proj:integration           # necesita Postgres/Redis
npm run test:proj:security              # sin dependencias externas (mocks)
npm run test:proj:unit
```

## Backlog inmediato
- Proteger `POST /admin/rotate-keys` (autenticación/admin roles) y automatizar rotación periódica.
- Emitir eventos (`user.registered`, `password.changed`) vía outbox y publicar métricas de saturación (pool PG, Redis).
- Actualizar OpenAPI + contract tests (Spectral + Jest) en CI y publicar SDK.
- Redactar tokens/PII en logs y definir alertas SLO sobre métricas anteriores.
