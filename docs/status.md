# Status Ejecutivo Backend SmartEdify
Fecha snapshot: 2025-09-15
Versión documento: 1.0

## 1. Resumen Ejecutivo
Estado general: Plataforma en fase de consolidación técnica. Auth-service estabilizado (suite integración consistente, recursos liberados). Tenant-service con Fase 0 completa y primeros endpoints críticos (transfer-admin, tenant-context). Prioridad inmediata: seguridad criptográfica (JWKS rotación asimétrica) y observabilidad (tracing inicial + métricas de negocio Auth).

Riesgos críticos mitigados: inestabilidad pruebas integración (mock Redis duplicado, DB no real), fugas de handles Jest, outbox DLQ sin purga.
Riesgos abiertos: ausencia de rotación automática de claves JWT (alto), falta de tests de contrato (medio), trazas distribuidas (medio), métricas negocio incompletas (medio), ausencia SBOM/Firma (supply‑chain, medio-alto), falta de políticas de logout/reuse enforcement más estricta (medio).

## 2. Estado por Servicio
### Auth Service
- MVP endpoints activos + flujo reset password.
- Rotación básica refresh tokens (sin lista corta access).
- Redis mock unificado; Postgres real en integración.
- Métricas técnicas expuestas; negocio pendiente.
- Backlog re-priorizado: JWKS (P1), gateway verify (P1), métricas negocio (P1), outbox eventos (P2), tracing (P2), logout + denylist corta (P3), WebAuthn/TOTP (P3).

### Tenant Service
- Fase 0 completada (migraciones núcleo + outbox + DLQ + métricas base).
- Endpoints: create tenant/unit/membership (baseline), transfer-admin, tenant-context.
- Métricas outbox y DLQ operativas (purge, reprocess).
- Próximo: memberships avanzados (solapamiento), gauge membership_active, delegaciones (Fase 3), cache contexto.

### User Service
- Scaffold mínimo; endpoints producción no listos.
- Pendiente: migraciones, OpenAPI, validaciones, integración eventos user.created.

### Assembly Service
- Diseño conceptual en docs; código no iniciado (riesgo de depender de contexto aún en evolución Tenant/Auth).

### Frontends (Web Admin / Web User / Móvil)
- No iniciados. Esperar estabilización de contratos Auth/Tenant y primer SDK generado.

## 3. Capacidades Transversales
| Área | Estado | Próximo Paso |
|------|--------|-------------|
| Testing | Integración estable (auth) | Añadir contract tests (OpenAPI + Spectral) |
| Observabilidad | Logs + métricas técnicas | Tracing OTel mínimo + métricas negocio |
| Seguridad | Hashing + rotación refresh | JWKS + verificación gateway |
| Eventos | Outbox + DLQ tenant | Introducir eventos auth (user.registered) |
| CI/CD | Workflow auth parcial | Imagen + SBOM + firma + plantillas reusables |
| Supply-chain | Básico (sin SBOM/firma) | Syft+Trivy+cosign |

## 4. Riesgos
### Mitigados
- Pruebas frágiles por mocks duplicados (Redis/pg) → Unificación + mapper.
- DLQ sin estrategia de purga → Endpoint purge + métricas edad.
- Fugas de handles Jest → Teardown explícito (Pool/Redis/metrics).

### Abiertos
| Riesgo | Impacto | Prob. | Mitigación Propuesta | ETA |
|--------|---------|-------|----------------------|-----|
| Sin rotación JWKS (claves estáticas) | Alto (compromiso tokens) | Medio | Implementar esquema dual current/next/retiring | T+7d |
| Falta tracing distribuido | Diagnóstico degradado | Medio | OTel mínimo endpoints críticos | T+10d |
| Sin métricas negocio Auth | Detección tardía abuso | Medio | Counters login/refresh/password_reset | T+7d |
| Sin contract tests | Regresiones API silenciosas | Medio | Spectral + snapshots | T+14d |
| Sin SBOM/Firma imágenes | Riesgo supply-chain | Medio-Alto | Syft + Trivy + cosign | T+21d |
| Logout sin invalidación estricta access | Ventana reutilización tokens | Bajo-Medio | Lista corta revocados + TTL | T+21d |

## 5. Próximos 14 Días (Sprint Objetivo)
1. Implementar JWKS rotación (endpoints OIDC + métrica rotation).
2. Métricas negocio Auth (`auth_login_success_total`, `auth_login_fail_total`, `auth_password_reset_total`, `auth_refresh_reuse_detected_total`).
3. Tracing mínimo (login, refresh, register, tenant-context) + propagación `x-request-id`.
4. Contract tests Auth (OpenAPI lint + snapshots sanitizados).
5. Evento `user.registered` (outbox + handler placeholder user-service).
6. Script Syft + Trivy (generar SBOM y escaneo en pipeline, sin failing gate inicial).

## 6. Métricas Clave (Baseline / Objetivo)
| Métrica | Baseline | Objetivo T+14d |
|---------|----------|----------------|
| p95 login latency | n/a (no tracing) | < 250ms |
| login success ratio | n/a | > 85% |
| refresh reuse detections | 0 (no métrica) | 0 (alerta si >0) |
| outbox_pending p95 age | < 2m | < 2m (alarma si >5m) |
| cobertura integration auth | ~? (no report formal) | Publicar badge + trend |

## 7. Decisiones Recientes (Delta)
| Fecha | Decisión | Razonamiento |
|-------|----------|--------------|
| 2025-09-15 | Priorizar JWKS antes de WebAuthn | Reduce superficie criptográfica urgente |
| 2025-09-15 | Roadmap métricas negocio definido | Necesario para alertas tempranas abuso |
| 2025-09-15 | Teardown recursos tests unificado | Estabilidad CI y limpieza handles |
| 2025-09-14 | Mock Redis único con mapper | Eliminar colisiones y flakiness |
| 2025-09-14 | DLQ outbox con purga | Control bloat y visibilidad fallos permanentes |

## 8. Bloqueos / Dependencias
- Falta definición final de gateway (para integrar verificación central JWT).
- Ausencia de repositorio eventos compartido (schema registry) → pospone validación estricta multi-servicio.
- Recursos limitados para frontends → planificación backend-first en curso.

## 9. Acciones Inmediatas (Next 72h)
- [ ] Implementar modelo clave JWT (tablas signing_keys) + migración.
- [ ] Endpoint JWKS + rotación programada (cron simple / script manual inicial).
- [ ] Instrumentar counters login/password_reset.
- [ ] Añadir tracing básico login/register.
- [ ] Crear job Spectral en CI (lint OpenAPI).

## 10. Notas / Observaciones
- Evitar introducir mocks globales nuevos sin revisar documento de política (ver sección 8 spec.md).
- Mantener documentación actualizada post-merge (README + spec + status).
- Revisar testTimeout warnings en Jest (ajustar si persisten tras refactor config).

---
Responsable CTO Snapshot: (auto-generado asistente) 2025-09-15
