# Plan de Optimización (CTO)

Fecha: 2025-09-17

## P0 — Gates y Limpieza inmediata
- [x] CI: Typecheck + Lint + Tests unit/contract (sin warnings, sin snapshots obsoletos)
- [x] CI: Validación Mermaid de todos los `.mmd`
- [x] CI: Lint de OpenAPI con Spectral en `api/**` y `apps/**/api/**`
- [x] README raíz: comandos Windows/Linux para tests; política de snapshots y warnings
- [ ] Limpieza: eliminar `apps/services/auth-service/db-test.js` (si no se usa) — El archivo aún existe y debe eliminarse si no se utiliza.
- [x] Limpieza: revisar/eliminar `apps/services/tenant-service/migrations_clean/` y `migrations_ts/` (duplicados)
	- Revisión completada: no existen dichas carpetas en tenant-service; no hay duplicados.

## P1 — Seguridad, Config y Pruebas
- [x] Config central con Zod para `process.env` (auth/tenant)
	- Integrado en arranque de ambos servicios: auth falla si falta `AUTH_ADMIN_API_KEY` en producción; tenant falla si falta `TENANT_DB_URL` en producción. README de cada servicio actualizado.
- [x] Automatizar rotación JWKS (cron/job) + métricas + rate limit endpoints admin
	- Hecho: workflow `jwks-rotate.yml` con `schedule` (cron), variables/secretos referenciados y endpoints `/admin/*` protegidos con `adminRateLimiter` + `admin-auth`.
	- Pendiente operacional: configurar `secrets`/`vars` en GitHub Environments para producción/staging (p.ej. `AUTH_SERVICE_ADMIN_API_KEY`, `AUTH_SERVICE_PG*`, `AUTH_SERVICE_BASE_URL`).
- [x] Añadir Schemathesis para pruebas contractuales OpenAPI (auth/tenant)
	- Hecho: job `schemathesis-contracts` en CI instala Python, corre `schemathesis` con `requirements-schemathesis.txt` y publica reportes (scripts en `scripts/contracts/run-schemathesis.js`).
- [x] Scripts raíz: `test:all`, `test:fast`, `test:contract`
	- Hecho: disponibles variantes `*:win|nix` en `package.json` y ejecutadas en Windows.

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
