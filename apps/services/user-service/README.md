# User Service

## Ejecución local

1. Instala dependencias y configura variables de entorno usando `.env.example`.
2. Ejecuta el servicio con el comando correspondiente (ejemplo: `go run cmd/server/main.go` o `npm start`).

## Variables de entorno
- USER_PORT
- USER_DB_URL
- USER_JWT_SECRET
- USER_LOG_LEVEL

## Endpoints principales
- GET `/users` (listar usuarios)
- POST `/users` (crear usuario)
- GET `/users/{id}` (ver usuario)
- PUT `/users/{id}` (actualizar usuario)
- DELETE `/users/{id}` (eliminar usuario)
- GET `/profile`
- PUT `/profile`
- GET `/preferences`
- PUT `/preferences`

## Decisiones técnicas
- Validaciones con Zod/JSON-Schema
- JWT para autenticación
- Migraciones versionadas en `migrations/`
- Outbox para eventos externos

## SLO
- Tiempo de respuesta < 300ms
- Disponibilidad > 99.9%

## Contacto equipo
- Equipo User: user-team@smartedify.com
