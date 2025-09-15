# Auth Service

## Visión y alcance actual
Este servicio cubre la autenticación central de SmartEdify tras separar la gobernanza multi-tenant en un Tenant Service dedicado. El MVP reforzado prioriza hashing seguro, emisión y rotación básica de tokens, protección contra fuerza bruta, recuperación de contraseña y observabilidad inicial. No gestiona delegaciones ni traspasos de administración; se enfoca en identidad, sesiones y tokens.

### Alcance implementado (estado actual)
- Endpoints REST básicos: `/register`, `/login`, `/refresh-token`, `/forgot-password`, `/reset-password`, `/health`, `/metrics`.
- Seguridad: Argon2id (costos diferenciados por entorno), JWT de acceso y refresh con rotación básica, rate limiting con guard por combinación email + IP.
- Recuperación de contraseña: tokens namespaced en Redis con fallback in-memory para pruebas.
- Observabilidad: logging estructurado (`pino`), métricas técnicas HTTP (Prometheus) y health check que valida Postgres y Redis.
- Pruebas: suite de integración estable (10 casos) que cubre el núcleo de registro/login/rotación con mocks controlados.

### Backlog clave (pendiente)
- Flujos OIDC completos: `authorize`, `token`, `userinfo`, `jwks`, `introspection`, `revocation`, discovery.
- Detección avanzada de reuse de refresh tokens y revocación por cadena.
- MFA (TOTP/WebAuthn) con step-up y claim `amr`.
- Outbox de eventos (`user.registered`, `password.changed`) y métricas de negocio.
- Tracing OTel (HTTP + DB) y métricas de saturación.
- Gestión criptográfica con rotación de llaves vía KMS/HSM.
- Integración contextual ligera con Tenant Service (`/tenant-context`).

### Visión futura OIDC
- Tokens alineados a OAuth2/OIDC: Authorization Code + PKCE (web/móvil) y Client Credentials (M2M).
- Firmas asimétricas (RS256/ES256) con rotación JWKS cada 90 días y doble publicación.
- Gestión de sesiones en Redis, reuse detection estricta y revocación por usuario, cliente o tenant.
- MFA (TOTP/WebAuthn) con `amr`/`acr`, step-up basado en scopes sensibles y device binding opcional.
- Auditoría de eventos de seguridad y métricas: `auth_login_total`, `token_issued_total`, `refresh_reuse_detected_total`, etc.

## Ejecución local
1. Instala dependencias y configura variables de entorno usando `.env.example`.
2. Ejecuta el servicio con el comando correspondiente (ejemplo: `npm start` o `go run cmd/server/main.go`).

## Variables de entorno
- AUTH_PORT
- AUTH_DB_URL
- AUTH_JWT_SECRET
- AUTH_WEBHOOK_URL
- AUTH_LOG_LEVEL

## Endpoints principales
- POST `/register`
- POST `/login`
- POST `/logout`
- POST `/forgot-password`
- POST `/reset-password`
- GET `/roles`
- GET `/permissions`

## Arquitectura lógica
```mermaid
flowchart LR
        Client[Cliente Web/App] --> API[Auth API]
        API --> HandlerLogin[Login Handler]
        API --> HandlerRegister[Register Handler]
        API --> HandlerRefresh[Refresh Handler]
        API --> HandlerForgot[Forgot Password]
        API --> HandlerReset[Reset Password]
        API --> Metrics[/metrics]
        subgraph Core
                Security[JWT + Hashing]
                Tokens[Emisión / Rotación]
        end
        API --> Core
        Core --> PG[(Postgres)]
        Core --> Redis[(Redis)]

subgraph Context
    TenantSvc[(Tenant Service)] --> CtxAPI[/tenant-context]
end
HandlerLogin --> CtxAPI
HandlerRefresh --> CtxAPI
```

## Decisiones técnicas
| Tema | Decisión | Justificación | Riesgo | Mitigación |
| ---- | -------- | ------------- | ------ | ---------- |
| Hashing | Argon2id con parámetros reducidos en test | Balancea seguridad en producción y velocidad en CI | Divergencia de parámetros | Validar configuraciones antes de releases |
| Tokens | JWT access + refresh con rotación básica | Permite MVP seguro sin OAuth2 completo | Reuse detection limitada | Extender con tracking de sesiones y revocación | 
| Claims de contexto | Payload mínimo, delegando gobernanza al Tenant Service | Evita inflar JWT y exposición de datos sensibles | Necesidad de datos de gobernanza en tiempo real | Mantener versión de contexto y fetch diferido |
| Rate limiting | Guard por email + IP con ventana fija | Mitiga ataques de fuerza bruta simples | No considera fingerprint de dispositivo | Evolucionar a bucket distribuido + device binding |
| Password reset | Tokens namespaced en Redis + fallback en memoria (solo test) | Aísla colisiones y facilita pruebas | Riesgo si fallback se usa fuera de test | Guard rails por `NODE_ENV` |
| Logging | `pino` con configuración reducida en test | Logs estructurados sin ruido en CI | Pérdida de algunos metadatos durante pruebas | Añadir wrapper/formatter cuando sea necesario |
| Métricas | HTTP genéricas + contadores negocio iniciales | Visibilidad rápida del MVP | Sin métricas avanzadas de seguridad | Instrumentar métricas específicas en backlog |

## Flujos implementados
- Registro de usuario con validación y hash Argon2id.
- Login con emisión de access/refresh tokens, rate limiting y lookup opcional de contexto Tenant.
- Refresh token con rotación básica y fallback de compatibilidad simétrica.
- Recuperación de contraseña: emisión de token namespaced y consumo único en reset.

## Observabilidad y seguridad
### Observabilidad
- Métricas HTTP + contadores negocio (`auth_login_success_total`, `auth_login_fail_total`, `auth_password_reset_*`, `auth_refresh_rotated_total`, `auth_refresh_reuse_blocked_total`).
- Logs JSON estructurados con correlación `x-request-id`.
- Próximo paso: tracing OTel y métricas de saturación (pool DB, latencia Redis, coste Argon2).

### Seguridad
- Hashing Argon2id endurecido en producción y reducido en test.
- JWT firmados (clave estática MVP) con planes de rotación KMS.
- Rate limiting y guard anti fuerza bruta.
- Tokens de recuperación de un solo uso.

## Rotación de Claves JWT (JWKS)
Se implementó un almacén de claves rotativas en la tabla `auth_signing_keys` con estados `current`, `next`, `retiring`, `expired`.

Endpoints:
- `GET /.well-known/jwks.json` devuelve claves públicas activas (`current`, `next`, `retiring`).
- `POST /admin/rotate-keys` fuerza rotación manual (MVP sin auth; proteger en producción).

Emisión y verificación de tokens:
- Los access y refresh tokens se firman con `RS256` usando la clave `current` e incluyen `kid`.
- La verificación realiza lookup por `kid` y valida contra la clave pública (`pem_public`).
- Fallback: si se definen `AUTH_JWT_ACCESS_SECRET` / `AUTH_JWT_REFRESH_SECRET` y el token no trae `kid`, se intenta validar simétricamente.

Rotación manual (flujo MVP):
1. `current` pasa a `retiring`.
2. `next` se promueve a `current`.
3. Se genera una nueva `next`.

Métricas expuestas:
- `auth_jwks_keys_total{status}` gauge de número de claves por estado.
- `auth_jwks_rotation_total` contador de rotaciones manuales.

Formato JWKS:
- Se expone en formato estándar: cada clave incluye `kty`, `n`, `e`, `alg`, `use`, `kid`, `status`.

Limitaciones pendientes:
- No hay job que marque `retiring -> expired` tras periodo de gracia.
- Endpoint de rotación sin control de acceso.
- Faltan alertas sobre ausencia de `next` o edad excesiva de `current`.

Pruebas locales rápidas:
```bash
curl -s http://localhost:8080/.well-known/jwks.json | jq
curl -XPOST http://localhost:8080/admin/rotate-keys
```

## Estrategia de pruebas
### Niveles de prueba
| Nivel | Estado actual | Cobertura objetivo | Notas |
| ----- | ------------- | ------------------ | ----- |
| Unit | Parcial (helpers hashing/jwt aún acoplados a handlers) | ≥ 70 % en etapa T1 | Extraer lógica a `internal/app` para aislar |
| Integración | Suite verde (10 casos) | Mantener y ampliar | Cubre register, login, refresh, forgot/reset |
| Contrato | No implementado | Definir tras publicar OpenAPI | Usar Prism / Schemathesis |
| E2E (gateway) | No disponible | Planificado tras OIDC completo | Validar JWT en gateway |
| Seguridad | Manual ad-hoc | Automatizar checks | Añadir gitleaks, `npm audit`, brute-force guard |

### Flujos cubiertos en integración
- Registro nuevo usuario (email único).
- Login correcto y fallido (password errónea con rate limiting progresivo).
- Rotación básica de refresh token.
- Recuperación de contraseña end-to-end.

### Flujos pendientes
- Detección de reuse de refresh tokens.
- Expiración y rechazo de refresh/token.
- Revocación manual (`/logout`) una vez implementado.
- Auditoría de eventos de seguridad y MFA.

### Datos de prueba y aislamiento
- Emails dinámicos por test (`test-${timestamp}@example.com`).
- Password fija con complejidad adecuada.
- Captura de tokens reset mediante fallback in-memory (solo test).
- Mocks compartidos de Redis (`__mocks__/ioredis`) y coste Argon2 reducido.

### Métricas y calidad
- Incorporar `tests_total`, `tests_failed_total` en CI.
- Gate de cobertura incremental (> 70 % T1, > 80 % T2).
- Histórico de duración de suite para detectar regresiones (> 20 %).

### Seguridad (checks automatizables)
- Dependencias vulnerables: `npm audit` / Trivy FS.
- Secret scanning: Gitleaks.
- Lint de seguridad (regex tokens).
- Test negativo de rotación refresh.

### Plan incremental
1. Instrumentar reuse detection y pruebas negativas.
2. Extraer lógica a servicios (`internal/app`) para habilitar unit tests puros.
3. Generar OpenAPI stub y activar tests de contrato.
4. Añadir métricas negocio y alertas.
5. Simular expiraciones mediante overrides de tiempo.

### Riesgos QA actuales
| Riesgo | Impacto | Mitigación |
| ------ | ------- | ---------- |
| Lógica de negocio mezclada en handlers | Dificulta unit tests | Refactor hacia capa de servicios |
| Sin coverage report | Regresiones sin visibilidad | Ejecutar `jest --coverage` y publicar en CI |
| Falta error paths en pruebas | Riesgo de falsos positivos | Añadir casos negativos: usuario inexistente, token corrupto/expirado |
| Sin pruebas de carga | Desconocimiento de p95 bajo estrés | Integrar k6/gatling tras estabilizar API |

### Guía práctica
#### Estructura de carpetas de pruebas
```
tests/
  unit/           # Pruebas unitarias sobre handlers y lógica
  integration/    # Flujo end-to-end (requiere Postgres/Redis reales)
  security/       # Pruebas aisladas JWKS/JWT con mocks de pg.adapter & ioredis
  jest.setup.ts   # Configuración adicional (matchers, etc.)
  global-setup.ts # Aplica migraciones si faltan tablas antes de correr tests
  global-teardown.ts # Cierra recursos
```

#### Entorno controlado (.env.test)
Se usa `.env.test` para definir puertos/credenciales específicos de pruebas. Si la tabla `users` no existe, el `global-setup` ejecuta `npm run migrate` (carpeta `migrations_clean`).

Variables mínimas recomendadas en `.env.test`:
```
PGHOST=localhost
PGPORT=5542
PGUSER=postgres
PGPASSWORD=postgres
PGDATABASE=smartedify
REDIS_HOST=localhost
REDIS_PORT=6639
AUTH_JWT_ACCESS_TTL=900s
AUTH_JWT_REFRESH_TTL=30d
NODE_ENV=test
```

#### Comandos
Ejecutar toda la suite:
```powershell
npm test -- --runInBand
```

Sólo pruebas de seguridad (mocks, rápido):
```powershell
npm test -- --runInBand tests/security
```

Sólo unitarias:
```powershell
npm test -- tests/unit
```

#### Mocks
- `tests/security/*` mockean `../../internal/adapters/db/pg.adapter` e `ioredis` para evitar dependencias externas.
- Los mocks se declaran dentro de cada archivo para no interferir con el resto de la suite.

#### Diagnóstico de handles abiertos
Si Jest no termina (mensaje de open handles):
```powershell
npm test -- --runInBand --detectOpenHandles
```

#### Estrategia de rotación cubierta en tests
- Generación de clave inicial (`current`).
- Creación automática de `next`.
- Promoción en rotación y generación de nueva `next`.
- Construcción del JWKS (formato JWK estándar).
- Emisión y verificación de access/refresh tokens (RS256 + `kid`).
- Rotación de refresh token evitando reuso.

#### Futuras mejoras de pruebas
- Añadir job simulado para estado `retiring -> expired`.
- Tests de performance de firma/verificación.
- Tests de resiliencia ante pérdida de cache local de claves.

### Riesgos y mitigaciones del servicio
| Riesgo | Impacto | Mitigación próxima | Prioridad |
| ------ | ------- | ------------------ | --------- |
| Falta reuse detection de refresh | Escalada de sesión ante token robado | Implementar almacenamiento de estado y cadena de JTI | Alta |
| Clave JWT estática | Ventana de compromiso ampliada | Rotación con KMS/HSM | Alta |
| Sin tracing OTel | Dificultad para RCA de latencias | Instrumentar spans HTTP + DB | Media |
| Sin métricas de negocio completas | Alertas insuficientes | Añadir counters y dashboards | Alta |
| Password reset tokens solo en Redis | Falta auditoría y expiración reforzada | Añadir TTL explícito y logging | Media |

### Backlog priorizado
1. Refresh reuse detection (revocación de cadena + tracking de sesiones).
2. Publicar OpenAPI base y contrato versionado.
3. Instrumentar tracing OTel (HTTP/DB).
4. Migraciones para sesiones, tracking de refresh y revocation list.
5. MFA TOTP y claim `amr`.
6. JWKS asimétrico + endpoints OIDC completos.
7. Outbox de eventos de seguridad (`user.registered`, `password.changed`).
8. Alertas SLO (latencia login, error rate, reuse attempts).

## SLO
- Tiempo de respuesta < 300ms
- Disponibilidad > 99.9%

## Contacto equipo
- Equipo Auth: auth-team@smartedify.com
