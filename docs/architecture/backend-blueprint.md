# Plano técnico del backend de SmartEdify

Este documento complementa la información de [ARCHITECTURE.md](../../ARCHITECTURE.md) con una vista operativa del monorepo y del estado de los servicios backend.

## Estructura del monorepo

- `apps/`: aplicaciones ejecutables (web, móvil y microservicios).
- `apps/services/<service>`: microservicios con estructura homogénea:
  - `cmd/server/main.*` como único *entrypoint*.
  - `internal/app` (commands, queries, sagas), `internal/domain` (aggregates, events, policies), `internal/adapters/http|repo|bus|ext` y `internal/config`.
  - `api/openapi.yaml` y `api/proto/` para contratos públicos.
  - `migrations/` para scripts SQL versionados.
  - `tests/unit|integration/` diferenciados por nivel.
  - `helm/` y `k8s/` para despliegue.
- `packages/`: librerías compartidas (core-domain, security, http-kit, event-bus, persistence, validation, i18n, ui-kit).
- `api/`: contratos externos consolidados (OpenAPI y protobuf).
- `db/`: migraciones globales y *seeders*.
- `infra/`: infraestructura declarativa (Terraform, Kubernetes, Docker, gateway).
- `ops/`: operaciones, *playbooks* y runbooks.
- `docs/`: documentación viva (PRD, diseño, API, legal).
- `tools/`: utilidades internas.
- `.github/`, `Makefile`, `CODEOWNERS`: automatización CI/CD y calidad.

## Guardrails técnicos transversales

### Cambios guiados por contratos
- Todo cambio en API requiere actualizar la definición OpenAPI/proto, ejemplos y la regeneración de SDKs cliente.
- Los contratos quedan versionados por servicio siguiendo SemVer; la publicación implica etiquetar y actualizar changelog.

### Configuración y seguridad operativa
- Variables de entorno con prefijo por servicio (`AUTH_`, `USER_`, `ASM_`) para evitar colisiones.
- No se almacenan secretos en el repositorio; TLS es obligatorio extremo a extremo y los JWT se validan en gateway y servicio.
- Los logs omiten PII y redactan tokens; *rate limiting* y protecciones contra fuerza bruta se documentan por endpoint.

### Persistencia y eventos
- Migraciones SQL versionadas, con una transacción por caso de uso.
- Se aplica patrón outbox para eventos externos y se documentan los índices requeridos.
- La comunicación síncrona (HTTP/gRPC) se reserva para lecturas y validaciones rápidas; la escritura y orquestación se resuelve vía eventos (Kafka/NATS) con `x-request-id`, `event-id`, *retries* exponenciales y DLQ.

### Documentación, calidad y ciclo de vida
- Cada servicio mantiene README actualizado, ADR relevantes en `docs/design/adr/` y diagramas en `docs/design/diagrams/`.
- Se ejecutan *lint* y *format* en *pre-commit*, se respetan las convenciones de commit y CODEOWNERS exige revisión cruzada.
- Ramas: `main` protegida; trabajo diario en `release/*`, `feat/*`, `fix/*`, `chore/*`.
- Workflows CI: `lint → test → build → scan → image → helm-lint → deploy(dev)` con promoción manual a staging/producción y escaneos SBOM/SCA (Trivy/Grype); las imágenes se firman (cosign) y se validan con Kyverno.

## Servicios backend y estado actual

### Auth Service (identidad y tokens)
**Estado** (MVP reforzado):
- Endpoints activos: `/register`, `/login`, `/refresh-token`, `/forgot-password`, `/reset-password`, `/health`, `/metrics`.
- Validaciones de entrada con Zod (DTOs en `adapters/http`).
- Hashing Argon2id configurable (`AUTH_ARGON2_*`).
- Emisión de JWT Access + Refresh (rotación básica con detección inicial de reutilización vía Redis planificada).
- *Rate limiting* de `/login` y guardia contra fuerza bruta (email + IP).
- Migraciones base (`users`, `user_roles`, `audit_security`).
- Logging JSON estructurado y métricas técnicas/negocio iniciales (login, reset, refresh rotation).
- Tokens de reset de contraseña aislados (Redis en producción, *in-memory* en test).

**Backlog prioritario**:
- (P1) JWKS y rotación de claves asimétricas (RS256/ES256) con endpoints OIDC (`/.well-known/jwks.json`, `/.well-known/openid-configuration`).
- (P1) Integración con gateway para verificación centralizada de JWT.
- (P1) Métricas adicionales: `auth_token_revoked_total`, `auth_lockouts_total`, `auth_refresh_reuse_detected_total` y latencia de rotación.
- (P2) Outbox + eventos (`user.registered`, `password.changed`).
- (P2) Tracing OTel con atributos `auth.user_id` y `auth.flow`.
- (P3) Política de logout (invalidar refresh actual + *denylist* corta para access tokens comprometidos).
- (P3) WebAuthn/TOTP tras estabilizar JWKS y gateway.
- (P3) OpenAPI consolidado con ejemplos versionados.

### User Service (perfil global)
- Responsabilidad: datos de perfil y atributos personales más enlace usuario↔tenant.
- Estado: CRUD `/users` en memoria; plan para `/profile` y `/preferences`.
- Próximos pasos: migraciones, validaciones, eventos `user.created`, métricas de usuarios activos e integración con Tenant Service para enriquecer vistas.
- Exclusión: no gestiona unidades físicas ni gobernanza (propiedad de Tenant Service).

### Tenant Service (gobierno y estructura organizativa)
- Responsabilidad: tenants, unidades, membresías (owner/renter/family), posiciones de gobernanza y políticas (unicidad admin, límites de delegaciones).
- Estado: fase 0 con contrato y migración inicial (`apps/services/tenant-service/api/openapi/tenant.yaml`). Tablas: `tenants`, `units`, `unit_memberships`, `governance_positions`, `tenant_policies`, `outbox_events`.
- Eventos planificados: `tenant.created`, `unit.created`, `membership.added|revoked|expired`, `governance.changed`.
- Métricas iniciales: `tenant_created_total`, `unit_created_total`, `membership_active`, `governance_transfer_total`, `membership_overlap_conflict_total`.
- Exclusiones: autenticación y datos personales ampliados (cubiertos por Auth/User Service).

### Assembly Service
- Consumidor de contexto (usuarios, tenants, roles de gobernanza) para calcular quórum, derechos de voto y flujos de actas.
- Depende del Tenant Service para validar roles de junta y membresías que afectan votos ponderados.

### Flujo estándar de creación de usuario (multi-tenant)
1. **Registro / invitación**: Auth Service crea identidad con hash Argon2id y, cuando exista outbox, emite `user.registered`.
2. **Persistencia de perfil**: User Service guarda atributos de perfil (nombre, idioma, preferencias) sin asignar unidades.
3. **Asociación a tenant**: Tenant Service establece la relación usuario↔tenant cuando aplica, sin detallar unidades.
4. **Asignación de unidades y gobernanza**: Tenant Service gestiona memberships específicos y transferencias/delegaciones mediante endpoints (`/tenants/{id}/governance/...`).
5. **Tokens con contexto**: Auth Service consulta o cachea `/tenant-context` para incluir `t_roles` y `tenant_ctx_version`; un cambio de versión fuerza actualización en el siguiente refresh.
6. **Consumo en otros servicios**: Assembly Service u otros consultan Tenant Service para cálculos profundos evitando inflar el JWT.

**Principios del flujo**:
- JWT minimalista: solo IDs y roles agregados; el detalle se obtiene *on-demand*.
- `tenant_ctx_version` evita *re-fetching* constante tras cambios de contexto.
- Segregación de dominios: ajustes de gobernanza no requieren desplegar Auth/User.
