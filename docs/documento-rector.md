# Documento Rector — SmartEdify_V0

## 1. Visión global
Objetivo: plataforma SaaS modular para educación. Tres dominios: User Portal, Admin Portal, Mobile App. **TODO** confirmar alcance MVP por dominio.

## 2. Áreas críticas detectadas
- JWKS rotation operativa pero sin guardianes automáticos (cron, alertas) ni protección del endpoint `/admin/rotate-keys`.
- Publisher Kafka y consumer reales pendientes (hoy logging stub + monitoreo de lag).
- CI sin gates de cobertura, contract tests ni escaneos de seguridad (solo Auth ejecuta pipeline completa).
- Placeholders sensibles en `.env` y compose (revisar antes de exponer entornos compartidos).

## 3. Dominios
### 3.1 User Portal
Funciones: registro, login, perfil, recuperación de contraseña. **TODO** flujos y vistas.

### 3.2 Admin Portal
Funciones: gestión de tenants, usuarios, roles, límites. **TODO** permisos y auditoría.

### 3.3 Mobile App
Funciones: autenticación, perfil, notificaciones. **TODO** alcance inicial.

## 4. Arquitectura global
Resumen ejecutivo en `ARCHITECTURE.md` y detalle técnico en `docs/architecture/overview.md`. Diagramas en `docs/mermaid/*`.
Ver `docs/mermaid/network-ports.mmd` para puertos y relaciones, y `plans/gateway/gateway-service.md` para el BFF.

## 5. Catálogo de funciones y endpoints
| Dominio | Función | Servicio | Endpoint | Método | Auth |
|---|---|---|---|---|---|
| User | Login | auth | `/login` | POST | público |
| User | Registro | auth | `/register` | POST | público |
| User | JWKS | auth | `/.well-known/jwks.json` | GET | público |
| User | Perfil (en desarrollo) | user | `/users/:id` | GET | bearer |
| Admin | Tenants | tenant | `/tenants` | POST | bearer (rol admin) |
| Admin | Contexto Tenant | tenant | `/tenant-context` | GET | bearer |
| Admin | Transferencia admin | tenant | `/tenants/{id}/governance/transfer-admin` | POST | bearer |
**TODO** completar y versionar desde OpenAPI actualizados.

## 6. Plan por microservicio
- auth-service: endurecer `/admin/rotate-keys`, cron de rotación automática, outbox (`user.registered`), contract tests y redacción de logs.
- user-service: migración a Postgres + OpenAPI/DTOs, integración con eventos Auth/Tenant y métricas de usuarios activos.
- tenant-service: delegaciones temporales (`/governance/delegate`), cache `tenant-context`, publisher Kafka real y políticas de gobernanza.

## 7. Roadmap
- Ver `docs/roadmap.md` para el backlog priorizado por servicio (migrado desde `docs/tareas.md`).
- T1: endurecer JWKS + outbox Auth + contract tests/CI.
- T2: delegaciones Tenant, migración User → Postgres, publisher Kafka real.
- T3: gateway con verificación central JWT, MFA y políticas de autorización avanzadas.

## 8. Buenas prácticas
Un servicio = una responsabilidad. Seguridad por defecto. Observabilidad integral. CI/CD con rollback. Límites de costo definidos.

## 9. ADRs globales
- ADR-0007 JWKS rotation. **TODO** ADR mensajería, multitenancy, autorización.

## 10. Apéndices
- Glosario, referencias y *runbooks*. **TODO**
- Auditorías periódicas: ver `docs/audits/2025-09-16-structure.md`.
