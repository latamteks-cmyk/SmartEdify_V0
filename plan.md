# Plan de Optimización (CTO)

Fecha: 2025-09-17

## P0 — Gates y Limpieza inmediata
- [ ] CI: Typecheck + Lint + Tests unit/contract (sin warnings, sin snapshots obsoletos)
- [ ] CI: Validación Mermaid de todos los `.mmd`
- [ ] CI: Lint de OpenAPI con Spectral en `api/**` y `apps/**/api/**`
- [ ] README raíz: comandos Windows/Linux para tests; política de snapshots y warnings
- [ ] Limpieza: eliminar `apps/services/auth-service/db-test.js` (si no se usa)
- [ ] Limpieza: revisar/eliminar `apps/services/tenant-service/migrations_clean/` y `migrations_ts/` (duplicados)

## P1 — Seguridad, Config y Pruebas
- [ ] Config central con Zod para `process.env` (auth/tenant)
- [ ] Automatizar rotación JWKS (cron/job) + métricas + rate limit endpoints admin
- [ ] Añadir Schemathesis para pruebas contractuales OpenAPI (auth/tenant)
- [ ] Scripts raíz: `test:all`, `test:fast`, `test:contract`

## P1 — Librería compartida interna
- [ ] Crear paquete `@smartedify/shared` con migrador base, métricas, mocks, JWT/JWKS utils, tipos comunes
- [ ] Refactorizar auth/tenant para consumir la librería

## P2 — Observabilidad y Docs
- [ ] Trazas mínimas en rutas clave y eventos outbox (correlación contexto)
- [ ] Dashboards de referencia (métricas de negocio + SLOs) y guía de operación
- [ ] Estandarizar todos los `.mmd` (frontmatter, sin fences, notas `<br/>`)

## Anexos (criterios de aceptación)
- Gates CI fallan con: warnings Jest/Lint, snapshots obsoletos, Mermaid inválido, Spectral con errores.
- `SKIP_DB_TESTS=1` probado en Windows y Linux; `/health` 200 en test; admin header/key documentados.
- Migraciones idempotentes con locks + checksums; logs verbosos solo por env.
