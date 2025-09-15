# Status Ejecutivo Backend SmartEdify
Fecha snapshot: 2025-09-17
Versión documento: 1.1

## 1. Resumen Ejecutivo
Estado general: plataforma en fase de endurecimiento. Auth-service ya opera con almacén JWKS asimétrico, métricas de negocio y tracing OTel; falta cerrar automatismos y outbox. Tenant-service concluyó Fase 0 con outbox, DLQ y `tenant-context` productivo. Prioridad inmediata: automatizar rotación JWKS, habilitar delegaciones y contract testing transversal.

Riesgos críticos mitigados: inestabilidad de pruebas (mock Redis único + teardown), DLQ sin purga, ausencia de métricas de negocio Auth.
Riesgos abiertos: rotación JWKS sin guardianes automáticos (alto), ausencia de contract tests (medio-alto), integración gateway/JWKS pendiente (medio), sin SBOM/firma (medio-alto), logout sin denylist corta (medio), delegaciones gobernanza sin implementación (medio).

## 2. Estado por Servicio
### Auth Service
- Endpoints en producción (`/register`, `/login`, `/refresh-token`, `/forgot-password`, `/reset-password`, `/logout`, `/roles`, `/permissions`) más `/metrics`, `/health`, `/.well-known/jwks.json` y `/admin/rotate-keys`.
- Hashing Argon2id, rate limiting + brute-force guard Redis, detección de reuse refresh tokens (`auth_refresh_reuse_blocked_total`).
- JWKS store con claves `current/next/retiring`, métrica `auth_jwks_keys_total{status}` y tracing OTel habilitado (auto instrumentation HTTP/Express/PG).
- Métricas de negocio activas: `auth_login_success_total`, `auth_login_fail_total`, `auth_password_reset_requested_total`, `auth_password_reset_completed_total`, `auth_refresh_rotated_total`.
- Backlog: proteger `/admin/rotate-keys` + job automático, outbox eventos, contract tests OpenAPI, redacción tokens en logs, integración gateway (`tenant_ctx_version`), MFA posterior.

### Tenant Service
- Fase 0 concluida: migraciones (`tenants`, `units`, `unit_memberships`, `governance_positions`, `roles`, `outbox_events`, `outbox_events_dlq`) y constraints activos.
- Endpoints productivos: `/tenants`, `/tenants/{id}/units` (POST/GET), `/units/{id}/memberships`, `/tenants/{id}/governance/transfer-admin`, `/tenant-context`, `/outbox/dlq` (GET/POST/DELETE), `/metrics`, `/health`.
- Outbox con poller, DLQ y métricas completas (`outbox_*`, `broker_*`, `consumer_*`), publisher Logging/Kafka + tracing `kafka.publish`.
- Backlog: delegaciones (`delegate`), validaciones solapamiento membership, cache `tenant-context` (TTL + invalidación), hardening publisher/consumer Kafka, motor políticas.

### User Service
- CRUD `/users` en Express apoyado en almacenamiento in-memory (sin persistencia real) y tests básicos.
- Pendientes: migraciones Postgres + contratos OpenAPI, validaciones Zod, integración eventos Auth/Tenant y métricas usuarios activos.

### Assembly Service
- Diseño conceptual en documentación; sin código ni contratos implementados.

### Frontends (Web Admin / Web User / Móvil)
- No iniciados. Esperar estabilización de contratos Auth/Tenant y primer SDK generado.

## 3. Capacidades Transversales
| Área | Estado | Próximo Paso |
|------|--------|-------------|
| Testing | Auth con suites unit/security/integration estables; Tenant/User sin cobertura en CI | Automatizar contract tests (Spectral + snapshots) y ejecutar Vitest en Tenant |
| Observabilidad | Métricas técnicas + negocio Auth/Tenant y tracing OTel básico | Publicar dashboards + alertas y añadir métricas de saturación (pool PG, cache contexto) |
| Seguridad | JWKS asimétrico operativo; logout sin denylist corta | Proteger `/admin/rotate-keys`, job automático y políticas gateway/denylist |
| Eventos | Tenant con outbox/DLQ/Kafka stub; Auth sin outbox | Implementar eventos Auth (`user.registered`, `password.changed`) y consumer inicial en User |
| CI/CD | Workflow Auth ejecuta lint/test/build/scan; Tenant sin pipeline completo | Extender pipelines (Vitest, coverage, contract tests) y publicar artefactos |
| Supply-chain | Sin SBOM, escaneo o firma | Integrar Syft + Trivy + cosign y documentar políticas Kyverno |

## 4. Riesgos
### Mitigados
- Pruebas frágiles por mocks duplicados (Redis/pg) → Unificación + mapper + teardown estable.
- DLQ sin estrategia de purga → Endpoints purge/reprocess + métricas edad.
- Ausencia de métricas negocio Auth → Counters login/reset/refresh publicados.

### Abiertos
| Riesgo | Impacto | Prob. | Mitigación Propuesta | ETA |
|--------|---------|-------|----------------------|-----|
| Rotación JWKS sin guardianes automáticos | Alto (compromiso tokens si falla manual) | Medio | Autenticación admin + cron + alertas JWKS | T+7d |
| Contract tests ausentes | Regresiones API silenciosas | Medio-Alto | Spectral + snapshots por servicio | T+14d |
| Integración gateway/JWKS pendiente | Tokens no validados centralmente | Medio | Coordinar despliegue gateway + cache JWKS | T+14d |
| Supply-chain sin SBOM/firma | Riesgo supply-chain | Medio-Alto | Syft + Trivy + cosign en pipeline | T+21d |
| Logout sin denylist corta access | Ventana de reutilización tokens | Medio | Implementar revocación corta + métrica reuse | T+21d |
| Delegaciones gobernanza sin implementación | Riesgo operativo multitenant | Medio | Desarrollar `/governance/delegate` + expiración | T+14d |

## 5. Próximos 14 Días (Sprint Objetivo)
1. Proteger `/admin/rotate-keys`, añadir autenticación administrativa y cron de rotación automática con métricas/alertas.
2. Implementar outbox Auth (`user.registered`, `password.changed`) y consumer inicial en User Service.
3. Entregar `/tenants/{id}/governance/delegate` con expiración automática y métrica `governance_delegation_active`.
4. Integrar Spectral + contract tests en CI (Auth y Tenant) y publicar reporte de cobertura.
5. Ejecutar Vitest + coverage en pipeline de Tenant, incluyendo lint y escaneo de seguridad (Syft + Trivy inicial).
6. Planificar migración de User Service a Postgres (ADR + diseño migraciones) para iniciar implementación en sprint siguiente.

## 6. Métricas Clave (Baseline / Objetivo)
| Métrica | Baseline | Objetivo T+14d |
|---------|----------|----------------|
| p95 login latency | 210 ms (Prometheus dev) | < 200 ms |
| auth_refresh_reuse_blocked_total | ≥0 (eventos aislados) | 0 (alerta si >0) |
| auth_jwks_keys_total{status="next"} | 1 clave | ≥1 (alerta si 0) |
| outbox_pending p95 age | < 2m | < 2m (alerta si >5m) |
| cobertura integration auth | 62 % (último run local) | ≥70 % y badge publicado |
| vitest tenant coverage | n/a | Publicar baseline ≥50 % |

## 7. Decisiones Recientes (Delta)
| Fecha | Decisión | Razonamiento |
|-------|----------|--------------|
| 2025-09-16 | Implementar almacén JWKS con rotación `current/next/retiring` | Habilitar claves asimétricas + métricas `auth_jwks_*` |
| 2025-09-16 | Publicar `/tenant-context` con roles combinados + versión hash | Permitir invalidaciones de claims y soporte multi-rol |
| 2025-09-16 | Activar métricas de negocio Auth (login/reset/refresh) | Base para alertas tempranas de abuso |
| 2025-09-15 | Teardown recursos tests unificado | Estabilizar suite Jest e impedir fugas de handles |
| 2025-09-14 | DLQ outbox con purga + métricas edad | Controlar bloat y facilitar operación |

## 8. Bloqueos / Dependencias
- Falta definición final de gateway (para integrar verificación central JWT).
- Ausencia de repositorio eventos compartido (schema registry) → pospone validación estricta multi-servicio.
- Recursos limitados para frontends → planificación backend-first en curso.

## 9. Acciones Inmediatas (Next 72h)
- [ ] Añadir autenticación al endpoint `/admin/rotate-keys` y restringirlo a roles administrativos.
- [ ] Configurar cron/manual runner para rotación JWKS (script + documentación de alerta si `next` = 0).
- [ ] Preparar PR de outbox Auth (`user.registered`) con prueba de integración inicial.
- [ ] Integrar Spectral lint en CI de Auth y Tenant (fail en warnings críticos).
- [ ] Definir ADR corto para migración User Service → Postgres (alcance y milestones).

## 10. Notas / Observaciones
- Evitar introducir mocks globales nuevos sin revisar documento de política (ver "Arquitectura de Testing" en `docs/architecture/overview.md`).
- Mantener documentación actualizada post-merge (README + `docs/architecture/overview.md` + `docs/roadmap.md` + este status).
- Revisar testTimeout warnings en Jest (ajustar si persisten tras refactor config).
- Revisar hallazgos de `docs/audits/2025-09-16-structure.md` y definir ajustes en `docs/architecture/overview.md`/`docs/roadmap.md` para cerrar brechas.
- Backlog priorizado consolidado en `docs/roadmap.md` (sustituye `docs/tareas.md`).

---
Responsable CTO Snapshot: (auto-generado asistente) 2025-09-17
