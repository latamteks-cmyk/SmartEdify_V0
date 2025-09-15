# Auth Service

## Ejecución local

1. Instala dependencias y configura variables de entorno usando `.env.example`.
2. Ejecuta el servicio con el comando correspondiente (ejemplo: `go run cmd/server/main.go` o `npm start`).

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

## Decisiones técnicas
- Validaciones con Zod/JSON-Schema
- JWT y WebAuthn para autenticación
- Migraciones versionadas en `migrations/`
- Outbox para eventos externos

## Rotación de Claves JWT (JWKS)

Se implementó un almacén de claves rotativas en la tabla `auth_signing_keys` con estados `current`, `next`, `retiring`, `expired`.

Endpoints:
- `GET /.well-known/jwks.json` devuelve claves públicas activas (`current`, `next`, `retiring`).
- `POST /admin/rotate-keys` fuerza rotación manual (MVP sin auth; proteger en producción).

Emisión y verificación de tokens:
- Los access y refresh tokens se firman con `RS256` usando la clave `current` e incluyen `kid`.
- La verificación ahora realiza lookup por `kid` y valida contra la clave pública (`pem_public`).
- Fallback: si se definen `AUTH_JWT_ACCESS_SECRET` / `AUTH_JWT_REFRESH_SECRET` y el token no trae `kid`, se intenta validar simétricamente (modo compat).

Rotación manual (flujo MVP):
1. `current` pasa a `retiring`.
2. `next` se promueve a `current`.
3. Se genera una nueva `next`.

Métricas expuestas:
- `auth_jwks_keys_total{status}` gauge de número de claves por estado.
- `auth_jwks_rotation_total` contador de rotaciones manuales.

Formato JWKS:
- Ya se expone en formato JWK estándar: cada clave incluye `kty`, `n`, `e`, `alg`, `use`, `kid`, `status`.

Limitaciones pendientes:
- No hay job que marque `retiring -> expired` tras periodo de gracia.
- Endpoint de rotación sin control de acceso.
- Faltan alertas sobre ausencia de `next` o edad excesiva de `current`.

Pruebas locales rápidas:
```bash
curl -s http://localhost:8080/.well-known/jwks.json | jq
curl -XPOST http://localhost:8080/admin/rotate-keys
```

## SLO
- Tiempo de respuesta < 300ms
- Disponibilidad > 99.9%

## Contacto equipo
- Equipo Auth: auth-team@smartedify.com

## Pruebas

### Estructura de carpetas
```
tests/
  unit/           # Pruebas unitarias sobre handlers y lógica
  integration/    # Flujo end-to-end (requiere Postgres/Redis reales)
  security/       # Pruebas aisladas JWKS/JWT con mocks de pg.adapter & ioredis
  jest.setup.ts   # Configuración adicional (matchers, etc.)
  global-setup.ts # Aplica migraciones si faltan tablas antes de correr tests
  global-teardown.ts # Cierra recursos
```

### Entorno controlado (.env.test)
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

### Comandos
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

### Mocks
- `tests/security/*` mockean `../../internal/adapters/db/pg.adapter` e `ioredis` para evitar dependencias externas.
- No interfieren con el resto porque el mock se declara dentro de cada archivo.

### Diagnóstico de handles abiertos
Si Jest no termina (mensaje de open handles):
```powershell
npm test -- --runInBand --detectOpenHandles
```

### Estrategia de rotación cubierta en tests
- Generación de clave inicial (current)
- Creación automática de `next`
- Promoción en rotación y generación de nueva `next`
- Construcción del JWKS (formato JWK estándar)
- Emisión y verificación de access/refresh tokens (RS256 + kid)
- Rotación de refresh token evitando reuso

### Futuras mejoras de pruebas
- Añadir job simulado para estado `retiring -> expired`
- Tests de performance de firma/verificación
- Tests de resiliencia ante pérdida de cache local de claves
