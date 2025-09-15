# Status Ejecutivo Backend SmartEdify
Fecha snapshot: 2025-09-22
Versión documento: 1.1

## 0. Changelog de Snapshots
| Fecha | Versión | Puntos clave |
|-------|---------|--------------|
| 2025-09-22 | 1.1 | Rotación JWKS operativa, métricas de negocio Auth publicadas y tracing básico en login/refresh. |
| 2025-09-15 | 1.0 | Radiografía inicial con Auth estabilizado y Tenant Fase 0 completada. |

## 1. Resumen Ejecutivo
Estado general: Plataforma en fase de endurecimiento. Auth-service ya opera con rotación dual de claves (JWKS) y métricas de negocio expuestas en dashboards de observabilidad; tracing básico disponible en los flujos críticos. Prioridad inmediata: cerrar gaps de contract testing (Auth/Tenant), ampliar trazas a tenant-context/outbox y reforzar el pipeline de supply-chain (SBOM + firma automatizada).

Riesgos críticos mitigados: ausencia de rotación JWKS (rotación dual + métricas), inestabilidad pruebas integración (mock Redis duplicado, DB no real), fugas de handles Jest, outbox DLQ sin purga.
Riesgos abiertos: cobertura incompleta contract tests (medio-alto), trazabilidad limitada en Tenant (medio), métricas de negocio Tenant sin definir (medio), ausencia SBOM/Firma con validación (medio-alto), políticas de logout/refresh aún laxas (medio).

## 2. Estado por Servicio
### Auth Service
- Rotación JWKS dual (current/next) con cron manual + alarmas de expiración.
  - Modelo `auth_signing_keys` persistiendo `kid`, algoritmo, PEM pública/privada (privada cifrada vía KMS en productivo) y estados `provisioning|current|retiring|deprecated`, con timestamps `activated_at`/`retiring_at`/`purge_after` e índices en `status` y `purge_after` para rotaciones y limpieza.
  - Flujo operativo: script genera nueva clave (`provisioning`), promueve a `current` y traslada la anterior a `retiring` con ventana `AUTH_JWKS_GRACE_SECONDS`; job/manual `AUTH_JWKS_ROTATION_CRON` marca `deprecated` y purga por `purge_after`.
  - Publicación en `/.well-known/jwks.json` (claves `current`+`retiring`) y `/.well-known/openid-configuration`; emisión firma solo con `current` y verificación acepta `current`+`retiring` con métricas `jwks_active_keys{status}` y `jwks_rotation_total`.
- Métricas de negocio publicadas (`auth_login_success_total`, `auth_login_fail_total`, `auth_password_reset_total`, `auth_refresh_reuse_detected_total`).
- Tracing OTel mínimo en login, refresh, register; propagación `x-request-id` operativa.
- Backlog inmediato: completar contract tests, exponer métricas en dashboards compartidos, implementar revoke-list corta para access tokens, automatizar rotación via job y consolidar pruebas de rotación (security project + integración multi-`kid`).

### Tenant Service
- Fase 0 estable; gauges de outbox/DLQ publicados.
- Endpoint `membership overlap` en desarrollo; cache de contexto definido pero no implementado.
- Requiere trazas compartidas con Auth y métricas de negocio (activaciones, tenants activos).

### User Service
- Scaffold extendido con listener `user.registered` y esquema base de migraciones.
- Falta exponer endpoints productivos y definir contrato OpenAPI inicial.

### Assembly Service
- Diseño actualizado tras cambios en autenticación; se bloquea hasta estabilizar contratos cross-service.

### Frontends (Web Admin / Web User / Móvil)
- No iniciados. Pendiente SDK actualizado tras contract tests.

## 3. Capacidades Transversales
| Área | Estado | Próximo Paso |
|------|--------|-------------|
| Testing | Integración Auth estable + snapshots parciales | Formalizar pipeline `spectral lint` + snapshots sanitizados (login, refresh, forgot/reset, register) |
| Observabilidad | Logs + métricas técnicas + tracing login | Extender tracing a tenant-context/outbox + tableros negocio |
| Seguridad | Hashing + rotación refresh + JWKS dual | Automatizar rotación + revoke list access |
| Eventos | Outbox + DLQ tenant | Emitir `user.registered` completo y consumirlo en user-service |
| CI/CD | Workflow auth parcial | Unificar plantillas + publicar reportes métricas en summary |
| Supply-chain | SBOM script manual (Syft/Trivy) | Integrar SBOM + cosign en pipeline (no-op gate inicial) |

## 4. Riesgos
### Mitigados
- Pruebas frágiles por mocks duplicados (Redis/pg) → Unificación + mapper.
- DLQ sin estrategia de purga → Endpoint purge + métricas edad.
- Fugas de handles Jest → Teardown explícito (Pool/Redis/metrics).
- Sin rotación JWKS (claves estáticas) → Rotación dual + alerting expiración.

### Abiertos
| Riesgo | Impacto | Prob. | Mitigación Propuesta | ETA |
|--------|---------|-------|----------------------|-----|
| Contract tests incompletos (Auth/Tenant) | Regresiones API silenciosas | Medio-Alto | Finalizar Spectral + snapshots end-to-end | T+10d |
| Tracing parcial en Tenant | Diagnóstico degradado | Medio | Instrumentar tenant-context y outbox | T+7d |
| Métricas negocio Tenant ausentes | Falta visibilidad activaciones | Medio | Definir KPIs + exponer gauges/counters | T+12d |
| SBOM/Firma sin validación pipeline | Riesgo supply-chain | Medio-Alto | Integrar Syft+Trivy+cosign en CI (warning gate) | T+14d |
| Logout sin invalidación estricta access | Ventana reutilización tokens | Medio | Lista corta revocados + TTL | T+21d |
| Falta de gate de cobertura en CI | Riesgo de regresiones silenciosas | Medio | Añadir umbral/badge automático post-reportes | T+21d |

## 5. Próximos 14 Días (Sprint Objetivo)
1. Completar contract tests Auth y Tenant (Spectral + snapshots sanitizados).
2. Extender tracing distribuido a tenant-context/outbox y publicar tableros iniciales.
3. Instrumentar métricas de negocio Tenant (tenants activos, memberships vigentes).
4. Automatizar rotación JWKS (cron job + verificación post-rotación) y short deny-list access tokens.
5. Integrar Syft/Trivy/cosign en pipeline (generación artefactos + firma, gate informativo).

## 6. Métricas Clave (Baseline / Objetivo)
| Métrica | Baseline | Objetivo T+14d |
|---------|----------|----------------|
| p95 login latency | 285ms (con tracing parcial) | < 250ms |
| login success ratio | 89% | > 92% |
| refresh reuse detections | 0 (alertas configuradas) | 0 (alerta si >0) |
| outbox_pending p95 age | 90s | < 90s (alarma si >180s) |
| cobertura integration auth | 72% (report interno) | ≥ 80% + badge público |

## 7. Decisiones Recientes (Delta)
| Fecha | Decisión | Razonamiento |
|-------|----------|--------------|
| 2025-09-22 | Adoptar rotación dual JWKS con métrica `auth_signing_key_age_days` | Garantizar renovación segura y trazabilidad |
| 2025-09-21 | Publicar métricas negocio Auth en Prometheus | Habilitar alertas sobre abuso/autenticaciones |
| 2025-09-20 | Incorporar tracing OTel básico | Reducir tiempo diagnóstico incidentes |
| 2025-09-18 | Priorizar contract tests sobre nuevas features Auth | Evitar regresiones en estabilización |
| 2025-09-15 | Roadmap métricas negocio definido | Necesario para alertas tempranas abuso |

## 8. Bloqueos / Dependencias
- Falta definición final de gateway (para integrar verificación central JWT).
- Ausencia de repositorio eventos compartido (schema registry) → pospone validación estricta multi-servicio.
- Recursos limitados para frontends → planificación backend-first en curso.

## 9. Acciones Inmediatas (Next 72h)
- [ ] Publicar pipeline Spectral que falle ante breaking changes.
- [ ] Instrumentar tracing en `tenant-context` y colas outbox.
- [ ] Configurar dashboard Grafana con métricas Auth negocio.
- [ ] Preparar script automation rotación JWKS (dry-run en staging).
- [ ] Añadir job Syft+Trivy en CI (sin gate crítico inicial).

## 10. Notas / Observaciones
- Evitar introducir mocks globales nuevos sin revisar documento de política (ver sección 8 spec.md).
- Mantener documentación actualizada post-merge (README + spec + status).
- Revisar testTimeout warnings en Jest (ajustar si persisten tras refactor config).
- Documentar decisiones de métricas en `docs/observability/README.md` tras publicación de dashboards.
- Registrar variables JWKS (`AUTH_JWKS_ALG`, `AUTH_JWKS_GRACE_SECONDS`, `AUTH_JWKS_ROTATION_CRON`) en el inventario de configuraciones operativas.

---
Responsable CTO Snapshot: (auto-generado asistente) 2025-09-22
