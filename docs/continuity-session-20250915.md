# Continuity Session Snapshot (CTO) - 2025-09-15

Este documento actúa como puente para la próxima sesión. Resume estado, decisiones, prioridades y acciones técnicas inmediatas pendientes. Mantenerlo hasta que se cree una versión actualizada o se consolide en `status.md`.

## 1. Contexto Breve
- Auth-service estabilizado: pruebas integración coherentes (Postgres real + Redis mock único + teardown de recursos).
- Tenant-service Fase 0 concluida con outbox + DLQ + métricas base y endpoint `tenant-context`.
- Documentación central sincronizada (`README.md`, `docs/architecture/overview.md`, `docs/status.md`, `docs/roadmap.md`).
- Diagramas ampliados (testing, JWKS, observabilidad, métricas, prioridades seguridad).

## 2. Prioridad Máxima Próximo Ciclo (P1)
1. Implementar rotación JWKS (asimétrica) + endpoints OIDC básicos.
2. Métricas de negocio Auth (login success/fail, password reset, refresh reuse) + exposición final.
3. Tracing mínimo (login, refresh, register, tenant-context) con propagación `x-request-id`.
4. Contract testing base: Spectral lint + snapshots sanitizados.

## 3. JWKS Rotación – Diseño Técnico Esencial
### 3.1 Tabla propuesta: `auth_signing_keys`
| Campo | Tipo | Notas |
|-------|------|-------|
| id (uuid) | PK | Identificador interno |
| kid (text) | UNIQUE | Usado en header JWT + JWKS |
| alg (text) | NOT NULL | RS256/ES256 (inicial RS256) |
| status (text) | ENUM(provisioning,current,retiring,deprecated) |
| private_pem (text) | Encriptar en despliegues productivos (KMS futuro) |
| public_pem (text) | Expuesto en JWKS |
| created_at (timestamptz) | | |
| activated_at (timestamptz) | | Cuando pasa a current |
| retiring_at (timestamptz) | | Inicio ventana gracia |
| deprecated_at (timestamptz) | | Fin ventana gracia |
| purge_after (timestamptz) | | Programación limpieza |

Índices sugeridos:
- `idx_auth_signing_keys_status` (para selección rápida current/retiring)
- `idx_auth_signing_keys_purge_after` (jobs de limpieza)

### 3.2 Flujo Rotación (Batch/Script)
1. Generar NUEVA clave (status=provisioning).
2. Promover provisioning → current; la current anterior pasa a retiring (set `retiring_at=now()` + TTL de gracia configurable `AUTH_JWKS_GRACE_SECONDS`).
3. Job (cron / script manual inicial) revisa claves retiring que superaron gracia → deprecated.
4. Claves deprecated con `purge_after < now()` se eliminan o se archivan.

### 3.3 Endpoints
- `GET /.well-known/jwks.json`: listar claves con status ∈ {current, retiring} → formato JWK (kty, n/e o crv/x/y, kid, alg, use=sign, key_ops=[verify]).
- `GET /.well-known/openid-configuration`: base mínima (issuer, jwks_uri, token_endpoint si aplica). (Opcional en primera iteración si gateway lo requiere posteriormente.)

### 3.4 Emisión JWT
- Firmar únicamente con clave status=current.
- Verificar tokens aceptando claves {current, retiring}.
- Métrica: `jwks_active_keys{status}` + counter `jwks_rotation_total`.

### 3.5 Variables de Entorno Nuevas
```
AUTH_JWKS_ALG=RS256
AUTH_JWKS_GRACE_SECONDS=3600
AUTH_JWKS_ROTATION_CRON="0 */6 * * *"   # (futuro) o se hace manual al inicio
```

### 3.6 Pruebas Iniciales
- security project: genera 2 rotaciones y asegura validación token firmado con clave retiring.
- integration: flujo register + login + refresh después de rotación (token anterior sigue válido dentro gracia).

## 4. Métricas de Negocio Auth – Implementación
Registrar counters Prometheus:
- `auth_login_success_total`
- `auth_login_fail_total`
- `auth_password_reset_total`
- `auth_refresh_reuse_detected_total`

Histograma adicional: `auth_login_duration_seconds` (p95 objetivo <250ms).

## 5. Tracing Mínimo (Scope)
Spans requeridos:
- `auth.login` (atributos: user_id?, outcome=success|fail, error_code)
- `auth.refresh` (claims prev, reuse_detected bool)
- `auth.register` (hashed=true, method=local)
- `tenant.context.fetch` (service=tenant-service, cache_hit bool future)

## 6. Contract Testing Base
Pipeline (fase inicial):
1. Lint OpenAPI (`spectral lint api/openapi/auth.yaml`).
2. Generar fixtures de requests (login, refresh, forgot/reset, register).
3. Ejecutar contra servicio en modo test y snapshot responses (normalizar tokens → `<JWT>` / `<REFRESH>` / timestamps → `<TS>`).
4. Falla si se altera schema sin actualizar OpenAPI.

## 7. Riesgos Técnicos Abiertos
| Riesgo | Mitigación | Prioridad |
|--------|------------|-----------|
| Falta de cifrado private_pem | Integrar KMS / envelope encryption | Media (post MVP JWKS) |
| Ausencia cleanup job purga | Script manual primero + tarea cron segundo sprint | Alta |
| Gaps en contract tests | Incremental endpoints críticos primero | Alta |
| Falta de gating cobertura | Añadir badge + umbral T2 | Media |

## 8. Checklist Handover (Antes de cerrar próxima PR JWKS)
- [ ] Migración `auth_signing_keys` aplicada.
- [ ] Script rotación manual `npm run rotate-key` (o similar) creado.
- [ ] Endpoint `/.well-known/jwks.json` responde 200 con current+retiring.
- [ ] Emisión JWT usa kid correcto.
- [ ] security tests pasan validando token retiring.
- [ ] Métricas jwks registradas.
- [ ] Documentación actualizada (`docs/architecture/overview.md` + `docs/status.md` + README raíz + diagramas si cambia flujo).

## 9. Referencias
- `docs/architecture/overview.md` Secciones "Arquitectura de Testing" y "Roadmap de Observabilidad".
- `docs/status.md` (snapshot estratégico completo).
- `docs/design/adr/ADR-0007-jwks-rotation.md`.
- Diagramas: `jwks-rotation-sequence.mmd`, `jwks-rotation-state.mmd`.

## 10. Próxima Acción Recomendada al Retomar
Comenzar creando migración y modelo `auth_signing_keys`, luego endpoint JWKS y prueba básica de verificación multi-kid.

---
Responsable: CTO (asistente) – Generado 2025-09-15
