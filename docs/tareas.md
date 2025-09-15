# Tareas Técnicas y Auditoría Backend SmartEdify

> Nota (2025-09-15): El snapshot ejecutivo consolidado (estado por servicio, riesgos, próximos 14 días) se mantiene ahora en `docs/status.md`. Este archivo (`tareas.md`) permanece como backlog granular y checklist de implementación. Al actualizar prioridades, reflejar primero en `status.md` y luego ajustar aquí para evitar divergencias.
## Estructura y Premisas
- [x] Crear carpetas obligatorias por servicio: `api/`, `migrations/`, `internal/app|domain|adapters|config/`, `tests/`, `helm/`, `k8s/` (Auth y User tienen estructura base; falta dominio estructurado y Assembly pendiente)
- [x] Usar kebab-case para carpetas, PascalCase para tipos, snake_case en SQL (aplicado parcialmente en servicios existentes)
- [x] Definir variables de entorno con prefijo por servicio y plantilla `.env.example` (existen `.env.example` en auth-service y user-service)
- [x] Documentar README por servicio con run local, variables, endpoints, decisiones, SLO, contacto equipo (README inicial presente; completar SLO y decisiones futuras)
- [x] Crear ADR en `docs/design/adr/`
- [ ] Diagramas Mermaid en `docs/design/diagrams/`
- [ ] Actualizar OpenAPI/proto y ejemplos en cada cambio de API
- [ ] Definir alertas SRE en `ops/sre/alerts/`
## Microservicios
### Auth Service
#### Estructura y configuración
- [x] Validar que la estructura de carpetas cumpla con la plantilla del monorepo (estructura mínima creada; refactor dominio pendiente)
- [x] Revisar dependencias y versiones en package/module files (revisión inicial realizada; optimización futura pendiente)
- [x] Definir variables de entorno y asegurar que no haya secretos en el repo (uso de `.env` y `.env.example`, sin secretos comprometidos)
- [ ] Checklist de configuración: TLS, JWT, tracing, logging
#### Endpoints y lógica
- [ ] Documentar contratos en OpenAPI antes de implementar
- [ ] Implementar endpoints siguiendo DTOs y no exponer entidades de dominio
- [ ] Validar inputs con Zod/JSON-Schema y documentar ejemplos
- [ ] Revisar integración con User Service y dependencias externas
#### Seguridad
- [ ] Revisar configuración de JWT y WebAuthn
- [x] Implementar hashing Argon2id y separación de secretos JWT
- [x] Emitir tokens access+refresh y rotación básica refresh
- [x] Añadir rate limiting / brute force guard en /login
- [ ] Validar logs sin PII y tokens redactados
- [ ] Checklist de pruebas de seguridad: brute force, roles, permisos
 - [x] Flujo forgot/reset password implementado y estable (token namespace + fallback memoria en test)
#### Persistencia y migraciones
- [x] Validar migraciones y versionado (schema base aplicado en carpeta limpia `migrations_clean/` con users, user_roles, audit_security + índices)
- [x] Revisar índices y constraints (básicos creados; análisis performance T2)
- [ ] Checklist de atomicidad y rollback en migraciones (documentar plan)
#### Pruebas
- [x] Revisar cobertura y calidad de pruebas unitarias/integración (existen pruebas iniciales en auth; falta ampliar y medir cobertura)
- [ ] Validar tests de contrato y snapshots
- [ ] Checklist de pruebas de migraciones en CI
 - [x] Estabilizar suite (Argon2 cost reducido en test, Redis mock compartido, emails únicos, eliminación logging frágil)
#### Observabilidad
- [x] Validar logging JSON (pino + pino-http). Tracing OTel pendiente.
- [x] Exponer métricas técnicas `/metrics` (HTTP requests total, duration histogram, node default)
- [ ] Métricas de negocio y alertas SRE
 - [ ] Instrumentar counters negocio: `auth_login_success_total`, `auth_login_fail_total`, `auth_password_reset_total`
#### Documentación y calidad
- [x] Checklist de actualización de README, ADR y diagramas (README presente; ADR/diagramas pendientes)
- [ ] Validar convenciones de commit y CODEOWNERS
#### CI/CD y seguridad supply-chain
- [x] Revisar workflow CI/CD y jobs (workflow multi-job auth-service creado: quality/tests/security/summary)
- [ ] Añadir build & push de imagen + helm lint
- [ ] Firma de imágenes (cosign), SBOM (Syft) y escaneo Trivy
  
#### Health & Runtime
- [x] Endpoint `/health` implementado con chequeo DB y Redis
- [x] Build TypeScript y Dockerfile ajustado a `dist/`
#### Integración y resiliencia
- [ ] Validar idempotencia, retries y DLQ
- [ ] Checklist de comunicación por eventos y HTTP/gRPC
### User Service
#### Estructura y configuración
- [x] Validar estructura y dependencias (estructura mínima creada en user-service)
- [x] Checklist de variables de entorno y configuración segura (archivo `.env.example` creado; refinar seguridad futura)
#### Endpoints y lógica
- [ ] Documentar contratos en OpenAPI antes de implementar
- [ ] Implementar endpoints CRUD y validaciones
- [ ] Revisar integración con Auth Service
#### Seguridad
- [ ] Validar JWT y roles en endpoints
- [ ] Checklist de logs y almacenamiento seguro
#### Persistencia y migraciones
- [ ] Validar migraciones, índices y constraints
- [ ] Checklist de atomicidad y rollback
#### Pruebas
- [ ] Revisar cobertura y calidad de pruebas
- [ ] Validar tests de contrato y migraciones
#### Observabilidad
- [ ] Validar tracing y métricas
#### Documentación y calidad
- [x] Checklist de actualización de README y diagramas (README mínimo presente; diagramas pendientes)
#### CI/CD y seguridad supply-chain
- [ ] Revisar workflow y escaneo de dependencias
#### Integración y resiliencia
- [ ] Validar idempotencia y comunicación por eventos
### Assembly Service
#### Estructura y configuración
- [ ] Validar estructura y dependencias
- [ ] Checklist de variables de entorno y configuración segura
#### Modelado y lógica de flujos
- [ ] Documentar contratos y flujos en PRD antes de implementar
- [ ] Implementar endpoints y validaciones
- [ ] Revisar integración con User y Auth Service
#### Seguridad
- [ ] Validar JWT y roles en endpoints
- [ ] Checklist de logs y almacenamiento seguro
#### Persistencia y migraciones
- [ ] Validar migraciones, índices y constraints
- [ ] Checklist de atomicidad y rollback
#### Pruebas
- [ ] Revisar cobertura y calidad de pruebas
- [ ] Validar tests de contrato y migraciones
#### Observabilidad
- [ ] Validar tracing y métricas
#### Documentación y calidad
- [ ] Checklist de actualización de README y diagramas
#### CI/CD y seguridad supply-chain
- [ ] Revisar workflow y escaneo de dependencias
#### Integración y resiliencia
- [ ] Validar idempotencia y comunicación por eventos
## Tareas transversales (Calidad, CI/CD, Seguridad, Observabilidad, Documentación)
### Calidad y convenciones
- [ ] Validar configuración de lint y format en pre-commit (no configurado todavía)
- [ ] Checklist de convenciones de commit y revisiones por CODEOWNERS
- [ ] Mantener cobertura mínima y reportes de pruebas
### CI/CD
- [ ] Auditar workflows y jobs por servicio
- [ ] Validar promoción manual y generación de changelogs
### Seguridad supply-chain
- [ ] Validar SBOM y escaneo de dependencias
- [ ] Checklist de firma de imágenes y policy admission
- [ ] Validar que no haya secretos en el repo
#### Observabilidad
- [x] Estructurar logs en formato JSON (pino + pino-http) 
- [ ] Definir métricas de negocio relevantes (intentos de login, bloqueos, etc.)
### Documentación
- [x] Checklist de actualización de README, ADR y diagramas (README base actualizado; ADR/diagramas por crear)
- [ ] Validar contratos OpenAPI/proto y ejemplos

## Tenant Service (Nuevo Bounded Context)
### Fase 0 (Fundaciones)
- [x] Crear `api/openapi/tenant.yaml` v0.1 (endpoints: create tenant, create unit, create membership, transfer-admin)
- [x] Migraciones iniciales: tenants, units, unit_memberships, governance_positions, tenant_policies, outbox_events
- [x] Índices y constraints básicos: unicidad código tenant, owner único activo (partial index)
- [x] Constraint solapamiento memberships (exclusion gist renter/owner activos)
- [x] Métricas base: `tenant_created_total`, `unit_created_total`, `membership_active`, `governance_transfer_total{result=*}` (instrumentadas parcialmente; membership_active gauge planificado en próxima iteración)
- [x] ADR #2 separación Tenant Service (decisión, alternativas, consecuencias)

### Fase 1 (Unicidad Admin + Eventos)
- [x] Endpoint transfer-admin (`/tenants/{id}/governance/transfer-admin`)
- [x] Evento `governance.changed` (acción transferred)
- [x] Test conflicto admin (409) (chain hash inicial pendiente en Fase 5)

### Fase 2 (Unidades y Memberships)
- [ ] CRUD creación unidad (create only + soft deactivate)
- [ ] Endpoint alta membership (`/units/{id}/memberships`)
- [ ] Validación solapamiento (renter/owner) y tests 409
- [ ] Evento `membership.added` + gauge `membership_active`

### Fase 3 (Delegaciones y Delegación Temporal)
- [ ] Endpoint delegate (`/tenants/{id}/governance/delegate`)
- [ ] Expiración TTL automática (worker / cron)
- [ ] Evento `governance.changed` (delegated / revoked)
- [ ] Métrica `governance_delegation_active` (gauge)

### Fase 4 (Contexto y Versionado)
- [x] Endpoint `/tenant-context?userId=` (roles agregados + version baseline sin cache)
- [ ] Integración Auth: incluir `tenant_ctx_version` en refresh
- [ ] Cache L1 + invalidación por evento contexto

### Fase 5 (Políticas y Hardening)
- [ ] Motor simple políticas (max_delegation_days, max_units opcional)
- [ ] Auditoría extendida + reconstrucción chain hash job
- [ ] Alertas SLO (latencia contexto, backlog outbox)

### Fase 0 Operability Addendum (Outbox/DLQ Hardening)
- [x] Métricas añadidas: `outbox_dlq_size`, `outbox_event_age_seconds`, `outbox_dlq_purged_total`
- [x] Gauge `outbox_pending` ya existente actualizado cíclicamente.
- [x] Endpoint `DELETE /outbox/dlq?olderThan=` purga eventos antiguos.
- [x] Repositorio: métodos `countDLQ()`, `purgeDLQOlderThan()`.
- [x] Poller: muestreo edad eventos pending y refresco gauges DLQ/pending.
- [x] Test integración `outbox-dlq-purge.test.ts` validando purga selectiva.
- [x] Documentar en README futuro runbook (pendiente redactar sección operativa).
 - [x] README ampliado con Runbooks (Backlog alto, Crecimiento DLQ, Purga, Reprocess masivo, Latencia publicación) y tabla de métricas.
 - [x] Consumer Processing (lag + processing + retries + métricas) documentado (ADR 0005 / README)


# Tareas para Completar el Proyecto SmartEdify

## Estructura y Premisas
- [x] Crear carpetas obligatorias por servicio: `api/`, `migrations/`, `internal/app|domain|adapters|config/`, `tests/`, `helm/`, `k8s/` (Auth/User listas; Assembly pendiente)
- [x] Usar kebab-case para carpetas, PascalCase para tipos, snake_case en SQL (aplicación parcial; reforzar en próximas PRs)
- [x] Definir variables de entorno con prefijo por servicio y plantilla `.env.example` (presentes en servicios backend actuales)
- [x] Documentar README por servicio con run local, variables, endpoints, decisiones, SLO, contacto equipo (nivel inicial)
- [ ] Crear ADR en `docs/design/adr/`
- [ ] Diagramas Mermaid en `docs/design/diagrams/`
- [ ] Actualizar OpenAPI/proto y ejemplos en cada cambio de API
- [ ] Definir alertas SRE en `ops/sre/alerts/`

## Microservicios


### Auth Service
#### Estructura y configuración
- [x] Crear carpetas: `api/`, `migrations/`, `internal/app`, `internal/domain`, `internal/adapters/http`, `internal/adapters/repo`, `internal/config`, `tests/unit`, `tests/integration`, `helm/`, `k8s/` (algunas subcarpetas vacías o por refactor; base creada)
- [x] Definir variables de entorno en `.env.example` con prefijo `AUTH_`
- [x] Crear README con instrucciones de ejecución local, variables, endpoints y dependencias

#### Endpoints y lógica
- [x] Diseñar y documentar endpoints REST: `/register`, `/login`, `/logout`, `/forgot-password`, `/reset-password`, `/roles`, `/permissions` (implementados en código; documentación formal pendiente)
- [x] Implementar validaciones de entrada con esquemas (Zod/JSON-Schema) (uso de Zod en DTOs)
- [x] No exponer entidades de dominio, usar DTOs en `adapters/http/dto/` (DTOs implementados; refinar modelos de dominio luego)
- [ ] Implementar lógica de autenticación y autorización en `internal/app` (pendiente refactor: actualmente lógica en handlers)
- [x] Integrar con User Service para validación cruzada (mock `user-service.mock` presente)

#### Seguridad
- [ ] Implementar JWT y verificación en gateway y servicio
	(Parcial: emisión y verificación lista dentro del servicio; pendiente integración gateway)
- [ ] Configurar TLS obligatorio
- [ ] Redactar tokens y logs sin PII
- [ ] Usar helpers de `packages/security/` para WebAuthn y TOTP
 - [x] Argon2id hashing + parámetros diferenciados por entorno (test vs prod)
 - [x] Emisión y rotación segura access/refresh (invalida anterior refresh / rotación básica)
 - [x] Rate limiting + brute force guard (clave email+IP)
 - [x] Flujo forgot/reset password (token consumo atómico + fallback memoria tests)

#### Persistencia y migraciones
- [x] Crear migraciones base (users, user_roles, audit_security) en `migrations_clean/`
- [ ] Migraciones para roles/permisos avanzados y auditoría extendida
- [ ] Declarar índices faltantes (email unique lower-case, expiración tokens)
- [ ] Usar repositorios genéricos de `packages/persistence/`
- [ ] Implementar patrón outbox para eventos externos

#### Pruebas
- [ ] Implementar pruebas unitarias en `tests/unit/` (estructura base falta; existen pruebas de integración)
- [x] Implementar pruebas de integración en `tests/integration/` para endpoints y flujos (presentes parcialmente)
- [ ] Pruebas de migraciones en CI
- [ ] Tests de contrato para HTTP/gRPC con snapshots
 - [x] Estabilizar suite (serial execution, lowering Argon2 cost, Redis mock compartido, emails únicos)
 - [ ] Test rotación refresh: uso de refresh antiguo debe fallar tras rotación

#### Observabilidad
- [ ] Configurar tracing OTel con `tenant_id`, `service`, `user_id`
- [x] Estructurar logs en formato JSON
- [x] Métricas técnicas HTTP expuestas
- [ ] Métricas de negocio (login_success_total, login_fail_total, password_reset_total)
 - [ ] Añadir métricas negocio en código y alertas SLO

#### Documentación y calidad
- [ ] Documentar API en OpenAPI (`api/openapi.yaml`) y ejemplos
- [ ] Actualizar README y ADR en cada cambio relevante
- [ ] Diagramas Mermaid de arquitectura y flujos
- [ ] Configurar lint y format en pre-commit
- [ ] Usar convenciones de commit y CODEOWNERS

#### CI/CD y seguridad supply-chain
- [x] Configurar workflow inicial multi-job (quality/tests/security/summary)
- [ ] Añadir publicación de imagen y helm-lint
- [ ] Firmar imágenes con cosign
- [ ] Policy admission (Kyverno): no-run-as-root, readOnlyRootFs
- [ ] Escaneo semanal de dependencias automatizado

#### Integración y resiliencia
- [ ] Comunicación sincrónica solo para validaciones rápidas
- [ ] Orquestación por eventos (Kafka/NATS) con outbox
- [ ] Idempotencia por `x-request-id` y `event-id`
- [ ] Retries exponenciales y DLQ


### User Service
#### Estructura y configuración
- [x] Crear carpetas: `api/`, `migrations/`, `internal/app`, `internal/domain`, `internal/adapters/http`, `internal/adapters/repo`, `internal/config`, `tests/unit`, `tests/integration`, `helm/`, `k8s/` (base creada aunque incompleta)
- [x] Definir variables de entorno en `.env.example` con prefijo `USER_`
- [x] Crear README con instrucciones de ejecución local, variables, endpoints y dependencias

#### Endpoints y lógica
- [ ] Diseñar y documentar endpoints REST: `/users` (CRUD), `/profile`, `/preferences`
- [ ] Implementar validaciones de entrada con esquemas (Zod/JSON-Schema)
- [ ] No exponer entidades de dominio, usar DTOs en `adapters/http/dto/`
- [ ] Implementar lógica de gestión de usuarios y perfiles en `internal/app`
- [ ] Integrar con Auth Service para validación de identidad y roles

#### Seguridad
- [ ] Validar JWT en cada endpoint
- [ ] Configurar TLS obligatorio
- [ ] Redactar tokens y logs sin PII
- [ ] Usar helpers de `packages/security/` para validaciones

#### Persistencia y migraciones
- [ ] Crear migraciones versionadas en `migrations/` para usuarios, perfiles, preferencias
- [ ] Declarar índices y constraints en migraciones
- [ ] Usar repositorios genéricos de `packages/persistence/`
- [ ] Implementar patrón outbox para eventos externos

#### Pruebas
- [ ] Implementar pruebas unitarias en `tests/unit/` (mínimo 80% cobertura en `internal/app` y `domain`)
- [ ] Implementar pruebas de integración en `tests/integration/` para endpoints y flujos
- [ ] Pruebas de migraciones en CI
- [ ] Tests de contrato para HTTP/gRPC con snapshots

#### Observabilidad
- [ ] Configurar tracing OTel con `tenant_id`, `service`, `user_id`
- [ ] Estructurar logs en formato JSON
 - [ ] Añadir counters negocio (login_success_total, login_fail_total, password_reset_total)
- [ ] Definir métricas de negocio relevantes (usuarios activos, cambios de perfil, etc.)

#### Documentación y calidad
- [ ] Documentar API en OpenAPI (`api/openapi.yaml`) y ejemplos
- [ ] Actualizar README y ADR en cada cambio relevante
- [ ] Diagramas Mermaid de arquitectura y flujos
- [ ] Configurar lint y format en pre-commit
- [ ] Usar convenciones de commit y CODEOWNERS

#### CI/CD y seguridad supply-chain
- [ ] Configurar workflow en `.github/workflows/user-service.yml` (lint, test, build, scan, image, helm-lint, deploy)
- [ ] Firmar imágenes con cosign
- [ ] Policy admission (Kyverno): no-run-as-root, readOnlyRootFs
- [ ] Escaneo semanal de dependencias

#### Integración y resiliencia
- [ ] Comunicación sincrónica solo para validaciones rápidas
- [ ] Orquestación por eventos (Kafka/NATS) con outbox
- [ ] Idempotencia por `x-request-id` y `event-id`
- [ ] Retries exponenciales y DLQ


### Assembly Service
#### Estructura y configuración
- [ ] Crear carpetas: `api/`, `migrations/`, `internal/app`, `internal/domain`, `internal/adapters/http`, `internal/adapters/repo`, `internal/config`, `tests/unit`, `tests/integration`, `helm/`, `k8s/`
- [ ] Definir variables de entorno en `.env.example` con prefijo `ASM_`
- [ ] Crear README con instrucciones de ejecución local, variables, endpoints y dependencias

#### Modelado y lógica de flujos
- [ ] Modelar flujos de negocio y procesos en `internal/domain` y documentar en PRD
- [ ] Diseñar y documentar endpoints REST: `/assemblies`, `/flows`, `/processes`
- [ ] Implementar validaciones de entrada con esquemas (Zod/JSON-Schema)
- [ ] No exponer entidades de dominio, usar DTOs en `adapters/http/dto/`
- [ ] Implementar lógica de orquestación y gestión de procesos en `internal/app`
- [ ] Integrar con User y Auth Service para validación y autorización

#### Seguridad
- [ ] Validar JWT en cada endpoint
- [ ] Configurar TLS obligatorio
- [ ] Redactar tokens y logs sin PII
- [ ] Usar helpers de `packages/security/` para validaciones

#### Persistencia y migraciones
- [ ] Crear migraciones versionadas en `migrations/` para flujos, procesos, relaciones
- [ ] Declarar índices y constraints en migraciones
- [ ] Usar repositorios genéricos de `packages/persistence/`
- [ ] Implementar patrón outbox para eventos externos

#### Pruebas
- [ ] Implementar pruebas unitarias en `tests/unit/` (mínimo 80% cobertura en `internal/app` y `domain`)
- [ ] Implementar pruebas de integración en `tests/integration/` para endpoints y flujos
- [ ] Pruebas de migraciones en CI
- [ ] Tests de contrato para HTTP/gRPC con snapshots

#### Observabilidad
- [ ] Configurar tracing OTel con `tenant_id`, `service`, `assembly_id`
- [ ] Estructurar logs en formato JSON
- [ ] Definir métricas de negocio relevantes (procesos ejecutados, errores, etc.)

#### Documentación y calidad
- [ ] Documentar API en OpenAPI (`api/openapi.yaml`) y ejemplos
- [ ] Actualizar README y ADR en cada cambio relevante
- [ ] Diagramas Mermaid de arquitectura y flujos
- [ ] Configurar lint y format en pre-commit
- [ ] Usar convenciones de commit y CODEOWNERS

#### CI/CD y seguridad supply-chain
- [ ] Configurar workflow en `.github/workflows/assembly-service.yml` (lint, test, build, scan, image, helm-lint, deploy)
- [ ] Firmar imágenes con cosign
- [ ] Policy admission (Kyverno): no-run-as-root, readOnlyRootFs
- [ ] Escaneo semanal de dependencias

#### Integración y resiliencia
- [ ] Comunicación sincrónica solo para validaciones rápidas
- [ ] Orquestación por eventos (Kafka/NATS) con outbox
- [ ] Idempotencia por `x-request-id` y `event-id`
- [ ] Retries exponenciales y DLQ



### Web Administrador
#### Ejemplos de historias de usuario
- Como administrador, quiero iniciar sesión de forma segura para acceder al panel de gestión.
- Como administrador, quiero crear, editar y eliminar usuarios y asignarles roles para controlar el acceso.
- Como administrador, quiero visualizar reportes y flujos de procesos para tomar decisiones informadas.
- Como administrador, quiero recibir mensajes claros de error y confirmación en cada acción.

#### Checklist UI/UX
- [ ] Navegación clara y consistente en todo el panel
- [ ] Formularios accesibles y con validaciones visibles
- [ ] Feedback visual para acciones (loading, éxito, error)
- [ ] Contraste y legibilidad adecuados (WCAG AA)
- [ ] Responsive en desktop y tablet
- [ ] Iconografía y tipografía consistente
- [ ] Internacionalización de textos
#### Estructura y configuración
- [ ] Crear carpetas: `src/`, `public/`, `components/`, `pages/`, `services/`, `hooks/`, `utils/`, `styles/`, `assets/`
- [ ] Definir variables de entorno en `.env.example` con prefijo `WEB_`
- [ ] Crear README con instrucciones de ejecución local, variables, endpoints, dependencias y convenciones de UI

#### UI y lógica
- [ ] Diseñar panel de administración con navegación clara y accesible (WCAG AA)
- [ ] Implementar gestión de usuarios (CRUD) y roles (RBAC) con feedback visual
- [ ] Visualizar flujos y reportes de procesos (Assembly Service) con gráficos y tablas
- [ ] Integrar con Auth Service para autenticación y autorización, manejo de expiración de sesión
- [ ] Usar componentes compartidos y tipados de `packages/ui-kit/` y `core-domain`
- [ ] Implementar formularios con validaciones, mensajes de error y loading states
- [ ] Internacionalización (i18n) para textos y mensajes

#### Seguridad
- [ ] Validar JWT y roles en cada petición a microservicios
- [ ] Restringir acceso por roles (RBAC) en frontend y backend
- [ ] Configurar TLS en despliegue y CSP en frontend

#### Integración
- [ ] Consumir APIs de Auth, User y Assembly Service con tipado estricto
- [ ] Manejar errores, estados de carga y reintentos automáticos
- [ ] Implementar hooks y contextos para integración con servicios y estado global

#### Pruebas
- [ ] Implementar pruebas unitarias de componentes, hooks y utilidades
- [ ] Pruebas de integración para flujos principales y mocks de API
- [ ] Pruebas de interfaz, accesibilidad y usabilidad (axe, testing-library)

#### Documentación y calidad
- [ ] Documentar estructura, flujos y convenciones en README
- [ ] Diagramas Mermaid de arquitectura, navegación y flujos de datos
- [ ] Configurar lint, format y pre-commit (eslint, prettier, stylelint)
- [ ] Usar convenciones de commit y CODEOWNERS

#### CI/CD y seguridad supply-chain
- [ ] Configurar workflow en `.github/workflows/web-app.yml` (lint, test, build, scan, deploy)
- [ ] Escaneo semanal de dependencias y auditoría de paquetes npm



### Web User
#### Ejemplos de historias de usuario
- Como usuario, quiero registrarme y acceder a mi cuenta de forma segura.
- Como usuario, quiero ver y editar mi perfil y preferencias.
- Como usuario, quiero acceder a los servicios y procesos disponibles según mi rol.
- Como usuario, quiero recibir notificaciones y mensajes claros sobre el estado de mis acciones.

#### Checklist UI/UX
- [ ] Navegación intuitiva y accesible
- [ ] Formularios con validaciones y mensajes claros
- [ ] Feedback visual para acciones (loading, éxito, error)
- [ ] Contraste y legibilidad adecuados (WCAG AA)
- [ ] Responsive en móvil y desktop
- [ ] Iconografía y tipografía consistente
- [ ] Internacionalización de textos
#### Estructura y configuración
- [ ] Crear carpetas: `src/`, `public/`, `components/`, `pages/`, `services/`, `hooks/`, `utils/`, `styles/`, `assets/`
- [ ] Definir variables de entorno en `.env.example` con prefijo `WEB_`
- [ ] Crear README con instrucciones de ejecución local, variables, endpoints, dependencias y convenciones de UI

#### UI y lógica
- [ ] Diseñar portal de usuario con navegación clara, accesible y responsiva (WCAG AA)
- [ ] Implementar acceso a servicios (Auth, User, Assembly) y gestión de perfil con feedback visual
- [ ] Usar componentes compartidos y tipados de `packages/ui-kit/` y `core-domain`
- [ ] Implementar formularios con validaciones, mensajes de error y loading states
- [ ] Internacionalización (i18n) para textos y mensajes

#### Seguridad
- [ ] Validar JWT y roles en cada petición a microservicios
- [ ] Restringir acceso por roles (RBAC) en frontend y backend
- [ ] Configurar TLS en despliegue y CSP en frontend

#### Integración
- [ ] Consumir APIs de Auth, User y Assembly Service con tipado estricto
- [ ] Manejar errores, estados de carga y reintentos automáticos
- [ ] Implementar hooks y contextos para integración con servicios y estado global

#### Pruebas
- [ ] Implementar pruebas unitarias de componentes, hooks y utilidades
- [ ] Pruebas de integración para flujos principales y mocks de API
- [ ] Pruebas de interfaz, accesibilidad y usabilidad (axe, testing-library)

#### Documentación y calidad
- [ ] Documentar estructura, flujos y convenciones en README
- [ ] Diagramas Mermaid de arquitectura, navegación y flujos de datos
- [ ] Configurar lint, format y pre-commit (eslint, prettier, stylelint)
- [ ] Usar convenciones de commit y CODEOWNERS

#### CI/CD y seguridad supply-chain
- [ ] Configurar workflow en `.github/workflows/web-app.yml` (lint, test, build, scan, deploy)
- [ ] Escaneo semanal de dependencias y auditoría de paquetes npm



### Aplicación Móvil
#### Ejemplos de historias de usuario
- Como usuario móvil, quiero iniciar sesión y mantener mi sesión activa de forma segura.
- Como usuario móvil, quiero recibir notificaciones push sobre eventos importantes.
- Como usuario móvil, quiero navegar entre pantallas y acceder a mis servicios y perfil fácilmente.
- Como usuario móvil, quiero que la app funcione correctamente en diferentes dispositivos y versiones.

#### Checklist UI/UX
- [ ] Navegación fluida y accesible entre pantallas
- [ ] Formularios con validaciones y mensajes claros
- [ ] Feedback visual para acciones (loading, éxito, error)
- [ ] Contraste y legibilidad adecuados (WCAG AA)
- [ ] Responsive en diferentes tamaños de pantalla
- [ ] Iconografía y tipografía consistente
- [ ] Internacionalización de textos
#### Estructura y configuración
- [ ] Crear carpetas: `src/`, `components/`, `screens/`, `services/`, `hooks/`, `utils/`, `assets/`, `styles/`
- [ ] Definir variables de entorno en `.env.example` con prefijo `MOBILE_`
- [ ] Crear README con instrucciones de ejecución local, variables, endpoints, dependencias y convenciones de UI

#### UI y lógica
- [ ] Diseñar navegación principal y pantallas de usuario accesibles y responsivas (WCAG AA)
- [ ] Implementar acceso a servicios (Auth, User, Assembly) y gestión de perfil con feedback visual
- [ ] Implementar notificaciones push (Firebase/OneSignal) y manejo de permisos
- [ ] Gestionar sesiones y persistencia segura de tokens
- [ ] Usar componentes compartidos y tipados de `packages/ui-kit/` si aplica
- [ ] Implementar formularios con validaciones, mensajes de error y loading states
- [ ] Internacionalización (i18n) para textos y mensajes

#### Seguridad
- [ ] Validar JWT y roles en cada petición a microservicios
- [ ] Configurar almacenamiento seguro de credenciales y tokens
- [ ] Restringir acceso por roles (RBAC) en frontend y backend
- [ ] Configurar TLS en despliegue y CSP en frontend

#### Integración
- [ ] Consumir APIs de Auth, User y Assembly Service con tipado estricto
- [ ] Manejar errores, estados de carga y reintentos automáticos
- [ ] Implementar hooks y contextos para integración con servicios y estado global

#### Pruebas
- [ ] Implementar pruebas unitarias de componentes, hooks y utilidades
- [ ] Pruebas de integración para flujos principales y mocks de API
- [ ] Pruebas de interfaz, accesibilidad y usabilidad (axe, testing-library)

#### Documentación y calidad
- [ ] Documentar estructura, flujos y convenciones en README
- [ ] Diagramas Mermaid de arquitectura, navegación y flujos de datos
- [ ] Configurar lint, format y pre-commit (eslint, prettier, stylelint)
- [ ] Usar convenciones de commit y CODEOWNERS

#### CI/CD y seguridad supply-chain
- [ ] Configurar workflow en `.github/workflows/mobile-app.yml` (lint, test, build, scan, deploy)
- [ ] Escaneo semanal de dependencias y auditoría de paquetes npm


## Tareas transversales (Calidad, CI/CD, Seguridad, Observabilidad, Documentación)
### Calidad y convenciones
- [ ] Configurar lint y format en pre-commit (`golangci-lint`, `eslint`, `ktlint`)
- [ ] Usar convenciones de commit (Conventional Commits)
- [ ] Revisiones obligatorias por CODEOWNERS
- [ ] Mantener cobertura mínima de pruebas en todos los servicios

### CI/CD
- [ ] Configurar workflows por servicio en `.github/workflows/*-service.yml` y apps
- [ ] Definir jobs: lint, test, build, scan, image, helm-lint, deploy
- [ ] Promoción manual a `stg`/`prod` con aprobación
- [ ] Generar y publicar changelogs automáticos

### Seguridad supply-chain
- [ ] Generar SBOM y escanear dependencias (Trivy/Grype)
- [ ] Firmar imágenes con cosign
- [ ] Policy admission (Kyverno): no-run-as-root, readOnlyRootFs
- [ ] Escaneo semanal de dependencias
- [ ] No almacenar secretos en el repo, usar vault y CI

### Observabilidad
- [ ] Configurar tracing OTel en todos los servicios
- [x] Estructurar logs en formato JSON (auth-service listo)
- [x] Métricas base en auth-service
- [ ] Extender métricas a otros servicios
- [ ] Definir métricas de negocio y alertas SRE en `ops/sre/alerts/`
 - [ ] Implementar counters negocio Auth y dashboards básicos

### Documentación
- [x] Mantener README actualizado por servicio (auth-service)
- [ ] Actualizar README user-service / assembly-service / frontends
- [ ] Documentar ADR en `docs/design/adr/`
- [ ] Diagramas Mermaid de arquitectura y flujos
- [ ] Actualizar OpenAPI/proto y ejemplos en cada cambio de API

## Pruebas y QA
## Estructura y Premisas (CTO Update 2025-09-15)
[ ] Diagramas Mermaid en `docs/design/diagrams/` (en progreso: se prioriza `auth-token-lifecycle.mmd` y `tenant-context-sequence.mmd` para próxima iteración)
- [ ] Pruebas de migraciones en CI
- [ ] Tests de contrato para HTTP/gRPC con snapshots
#### Pruebas
[x] Revisar cobertura y calidad de pruebas de integración (suite estable; falta ampliar unit y contract tests)
[ ] Validar tests de contrato y snapshots (Spectral lint + snapshot HTTP pendiente)
[ ] Checklist de pruebas de migraciones en CI (agregar job específico)
[x] Estabilizar suite (Argon2 cost reducido en test, Redis mock extendido único, emails únicos, eliminación logging temporal, cierre Pool/Redis)
## Legal y Marketing
#### Observabilidad
[x] Logging JSON (pino + pino-http) validado
[x] Métricas técnicas `/metrics` (HTTP, process, GC)
[ ] Tracing OTel (instrumentación plan Sprint 1 Roadmap Observabilidad)
[ ] Métricas de negocio y alertas SRE
[ ] Counters negocio: `auth_login_success_total`, `auth_login_fail_total`, `auth_password_reset_total`, `auth_refresh_reuse_detected_total`

#### Seguridad
[ ] Revisar configuración de JWT y WebAuthn (priorizar JWKS + rotación antes de WebAuthn)
 [ ] Validar logs sin PII y tokens redactados (añadir mascarado de claims sensibles)
 [ ] Checklist de pruebas de seguridad: brute force, roles, permisos (brute force covered, roles/permissions falta plan formal)
### Registro de Ejecuciones (Log de Avances)
#### Persistencia y migraciones
[x] Migraciones base validadas (`migrations_clean/`)
[x] Índices y constraints básicos OK (plan performance T2: índices compuestos email lower, revoked tokens TTL)
[ ] Checklist de atomicidad y rollback (definir plantilla estandarizada)
- (2025-09-14) Logging estructurado (pino + pino-http) y propagación `x-request-id`.
- (2025-09-14) Dockerfile optimizado (multi-stage + prune dev deps + HEALTHCHECK).
- (2025-09-14) Scripts migración (`migrate`, `migrate:create`) y ejecución exitosa.
### Calidad y convenciones
[ ] Validar configuración de lint y format en pre-commit (añadir Husky + lint-staged)
- (2025-09-14) Workflow CI multi-job (quality/tests/security/summary) incorporado.
### CI/CD
[ ] Auditar workflows y jobs por servicio (unificar plantillas reusables)
 - (2025-09-14) Implementado Argon2id hashing (parámetros diferenciados test/prod) y JWT access/refresh con rotación.
### Seguridad supply-chain
[ ] Validar SBOM y escaneo de dependencias (Syft + Trivy pipeline)
 - (2025-09-14) Flujo forgot/reset password estable (namespace tokens + fallback memoria tests).
#### Observabilidad
[x] Logs JSON estructurados
[ ] Definir métricas de negocio (login, lockouts, reuse refresh) y alertas
 - (2025-09-14) Outbox poller inicial en tenant-service con métricas (attempts, published, failed, retry, latency histogram, backlog gauge).
 - (2025-09-14) DLQ outbox: migración `202509141700_outbox_dlq.sql` y mover eventos failed_permanent a `outbox_events_dlq`.
	- (2025-09-14) Test integración DLQ (`outbox-dlq.test.ts`) validando traslado a tabla DLQ.
		- (2025-09-14) Endpoints DLQ (`GET /outbox/dlq`, `POST /outbox/dlq/:id/reprocess`) + métrica `outbox_reprocessed_total` + test reproceso.
 - (2025-09-14) Hardening migraciones Tenant Service: tabla `schema_migrations` con checksum SHA-256 + advisory lock, backfill idempotente.
 - (2025-09-14) Implementado endpoint transfer-admin + evento `governance.changed` + test conflicto 409 (idempotencia validada).
 - (2025-09-14) Endpoint `/tenant-context` agregado (agregación roles governance + memberships; version hash baseline).
 - (2025-09-14) Outbox pattern: lógica retries temporales corregida + pruebas integración (`outbox-retries.test.ts`).

### Próximos Hitos (Backlog Prioritario)
1. Seguridad aplicación:
 - [ ] Verificación central JWT en gateway (servicio ya emite/verifica internamente)
 - [ ] Redactar tokens y logs sin PII (middleware de sanitización pendiente)
 - [ ] Usar helpers de `packages/security/` para WebAuthn y TOTP (post JWKS)
 - [ ] Refactor: mover lógica auth a `internal/app` (separar DTO/handler de casos de uso)
 - [ ] Índices faltantes: email lower unique, expiry refresh revocados
3. Supply-chain:
	- SBOM (Syft) y escaneo Trivy en CI
	- Firma de imagen (cosign) y policy admission
4. Calidad:
	- Gate cobertura (>=70% T1, >80% T2)
	- Tests migraciones y contratos
5. Resiliencia:
	- Outbox + event bus
	- Retries exponenciales y DLQ