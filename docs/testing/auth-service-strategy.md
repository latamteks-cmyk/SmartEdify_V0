# Estrategia de testing del Auth Service

Esta guía recoge la arquitectura de pruebas multi-proyecto, estado consolidado (47 tests / 18 suites) y compromisos de cobertura para el servicio de autenticación. La suite actual está totalmente aislada de infraestructura física (DB/Redis) mediante mocks deterministas para acelerar el ciclo CI y reducir flakiness inicial.

## Objetivos transversales de calidad
- Cobertura mínima actual: 60 % en `internal/app` y adaptadores críticos.
- Meta de mediano plazo: ≥80 % incluyendo dominio.
- Se incorporará una métrica adicional sobre rutas HTTP críticas (login, refresh, reset).

## Arquitectura de proyectos Jest (estado actual)
Históricamente se plantearon tres proyectos (`security`, `unit`, `integration`) con diferentes niveles de acoplamiento. En la fase actual todos operan sobre mocks de DB/Redis para eliminar dependencias externas mientras madura la API. Una futura fase reactivará `integration` contra contenedores reales.

Resumen actual:
- `unit/`: Handlers y lógica de flujo (temporariamente aún mezcla negocio + HTTP).
- `integration/`: Flujos encadenados (login->refresh->logout, health, register/login; actualmente también mockeados de DB).
- `security/`: JWT, rotación de claves, validaciones de `kid` y JWKS.

Conteo consolidado: 47 tests (18 suites) tras eliminar duplicados de password reset (`forgot-password.test.ts`, `reset-password.test.ts`, `forgot-reset.integration.test.ts`).

## Política de mocks
- `pg.adapter` sustituido por `__mocks__/pg.adapter.ts` (in-memory) con soporte para usuarios, roles y claves RS256 (`current|next|retiring`).
- `ioredis` reemplazado por mock único que implementa subset (`set`, `get`, `del`, `incr`, `expire`, `ttl`).
- No se ejecutan migraciones reales en CI actualmente; la validación estructural de SQL queda aplazada a la futura suite E2E/contrato.
- Todo nuevo mock debe documentarse primero en el README (sección “Mocks y Aislamiento”).

## Datos y aislamiento en pruebas
- Emails dinámicos (timestamp / random) evitan colisiones en el store in-memory.
- Coste Argon2id reducido (`t=2, m=4096, p=1`).
- Registro de métricas reinicializado entre pruebas críticas (password reset / refresh) para asegurar conteos esperados.
- Sin conexiones abiertas a Postgres/Redis: reducción de flakiness y tiempo total (< 17s). 

## Cobertura y métricas de calidad
- Se instrumentarán contadores `test_flaky_detected_total` (incrementa cuando una re-ejecución pasa tras un fallo intermitente).
- Histograma `test_duration_seconds{project}` para detectar regresiones de rendimiento.

## Contratos y *snapshots*
- Próximo hito: pruebas de contrato HTTP desde OpenAPI (`api/auth.yaml`) usando Spectral + Schemathesis.
- Uso moderado de snapshots: sanitizar tokens (`<JWT>` / `<REFRESH>` / `<RESET_TOKEN>`).

## Dependencias de seguridad inmediatas
1. Reuse detection avanzada: cadena de refresh tokens + invalidación transitiva.
2. Expiración y transición automático `retiring -> expired` en claves RS256.
3. Contrato OpenAPI estable (lint + ejemplos) para habilitar contract tests.
4. Reporte de cobertura integrado al pipeline (thresholds progresivos 70% → 80%).

## Métricas de soporte a la calidad
- `auth_password_reset_requested_total` & `auth_password_reset_completed_total`: ya instrumentadas y testeadas.
- Agregar `auth_refresh_reuse_blocked_total` en escenarios de reuse detection extendida.
- Considerar histograma de duración de Argon2 para calibrar parámetros.

## Evolución planificada de la suite
| Fase | Objetivo | Cambio clave |
|------|----------|--------------|
| F1 | Estabilización aislada | Mocks completos DB/Redis (estado actual) |
| F2 | Validación estructural | Reintroducir integration real con contenedores efímeros |
| F3 | Contratos | OpenAPI + Schemathesis + Spectral gating |
| F4 | Seguridad avanzada | Reuse detection + MFA tests + expiraciones forzadas |
| F5 | Rendimiento | k6 para p95 login/refresh + profiling Argon2 |

## Eliminación de duplicados (histórico)
Se consolidó el flujo de password reset en `forgot-reset.test.ts` y métricas en `password-reset.metrics.test.ts`. Eliminados físicamente:
- `forgot-password.test.ts`
- `reset-password.test.ts`
- `forgot-reset.integration.test.ts`

Esto permitió remover `testPathIgnorePatterns` del `jest.config.cjs` simplificando la configuración.
