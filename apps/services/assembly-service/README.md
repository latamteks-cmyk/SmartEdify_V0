# Assembly Service

## Ejecución local

1. Instala dependencias y configura variables de entorno usando `.env.example`.
2. Ejecuta el servicio con el comando correspondiente (ejemplo: `go run cmd/server/main.go` o `npm start`).

## Variables de entorno
- ASM_PORT
- ASM_DB_URL
- ASM_JWT_SECRET
- ASM_LOG_LEVEL

## Endpoints principales
- GET `/assemblies` (listar asambleas)
- POST `/assemblies` (crear asamblea)
- GET `/assemblies/{id}` (ver asamblea)
- PUT `/assemblies/{id}` (actualizar asamblea)
- DELETE `/assemblies/{id}` (eliminar asamblea)
- GET `/flows` (listar flujos)
- POST `/flows` (crear flujo)
- GET `/processes` (listar procesos)
- POST `/processes` (crear proceso)

## Decisiones técnicas
- Validaciones con Zod/JSON-Schema
- JWT para autenticación
- Migraciones versionadas en `migrations/`
- Outbox para eventos externos

## SLO
- Tiempo de respuesta < 300ms
- Disponibilidad > 99.9%

## Contacto equipo
- Equipo Assembly: assembly-team@smartedify.com
