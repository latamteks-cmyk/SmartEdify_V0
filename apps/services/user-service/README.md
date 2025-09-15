# User Service

## Visión y alcance
El **User Service** administra la identidad interna de SmartEdify y actúa como fuente de verdad de perfiles, membresías de tenant, roles y preferencias. Complementa al Auth Service sincronizando claims y exponiendo APIs de negocio orientadas a Assembly, Finance, Communication y otras capacidades de la plataforma.

### Requisitos funcionales clave
- CRUD de usuarios bajo contexto `tenant_id`.
- Asignación y revocación de roles.
- Gestión de relaciones multi-tenant (un usuario puede pertenecer a varios condominios).
- APIs de consulta para otros servicios (Assembly, Finance, Communication, etc.).
- Búsqueda avanzada por nombre, email, documento, tenant.
- Importación/exportación de padrones y coeficientes.
- Desactivación/reactivación con registro de motivo y auditoría.
- Sincronización opcional de contexto con Auth Service.

### Requisitos no funcionales
- SLA 99.9 % y latencia de lectura p95 < 100 ms.
- Escalabilidad a 500k usuarios y 10k tenants.
- Auditoría inmutable y cumplimiento LOPDP/GDPR (data minimization, derecho al olvido).
- API versionada (OpenAPI 3.1) con trazabilidad por `tenant_id` y `user_id`.

### Modelo de datos lógico
- `users(id, global_id, nombre, apellido, email, phone, documento_tipo, documento_num, status, created_at, updated_at)`.
- `tenants(id, nombre, direccion, ruc, created_at)`.
- `user_tenants(user_id, tenant_id, rol, coeficiente, estado)`.
- `roles(id, nombre, scope, descripcion)`.
- `preferences(user_id, lang, notif_email, notif_sms, notif_push)`.
- `audit_user(id, user_id, actor_id, action, changes_json, ts)`.

Índices destacados:
- `users(email)` y `users(documento_tipo, documento_num)` únicos.
- `user_tenants(user_id, tenant_id)` único.
- `audit_user(user_id, ts)` para trazabilidad.

## Arquitectura del sistema

### Vista de contenedores
```mermaid
flowchart LR
  subgraph Clients
    WEB[Web App (RBAC)]
    MOB[App Móvil]
    NOC[Web Soporte]
  end

  APIGW[API Gateway + WAF]
  USVC[User Service]
  AUTH[Auth Service]
  DOC[Document Service]
  COMM[Communication Service]
  BUS[Event Bus (Kafka/NATS)]
  DB[(PostgreSQL)]
  CACHE[(Redis)]
  AUDIT[(WORM Storage)]

  WEB --> APIGW --> USVC
  MOB --> APIGW --> USVC
  NOC --> APIGW --> USVC

  USVC --> DB
  USVC --> CACHE
  USVC --> AUTH
  USVC --> DOC
  USVC --> COMM
  USVC --> BUS
  USVC --> AUDIT
```

### Componentes internos
- **API Layer:** controladores REST/gRPC, validación y aplicación de scopes.
- **User Core:** lógica de creación/actualización, roles y estados de usuario.
- **Tenant Manager:** manejo multi-tenant, coeficientes, import/export.
- **Role Engine:** motor RBAC/ABAC y políticas de negocio.
- **Preferences:** preferencias de comunicación e idioma.
- **Repositories:** persistencia en Postgres y cache de perfiles en Redis.
- **Audit Logger:** registra cambios en tabla histórica y archivo WORM.
- **Event Publisher:** dispara `user.created`, `user.updated`, `user.deactivated`.

### Integraciones
- **Auth Service:** sincroniza claims (`roles`, `tenant_id`, `status`).
- **Document Service:** guarda documentos de identidad y poderes.
- **Communication Service:** usa datos de contacto y preferencias para notificaciones.
- **Event Bus:** propaga eventos a Assembly, Finance y otros dominios.

### Resiliencia
- Idempotencia en `user.create` usando `global_id` (ej. DNI) como referencia.
- Circuit breakers hacia Auth y Communication.
- Auditoría WORM para evitar pérdida de historial.

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
- Validaciones con Zod/JSON-Schema.
- JWT para autenticación.
- Migraciones versionadas en `migrations/`.
- Outbox para eventos externos.

## SLO
- Tiempo de respuesta < 300ms.
- Disponibilidad > 99.9%.

## Contacto equipo
- Equipo User: user-team@smartedify.com.
