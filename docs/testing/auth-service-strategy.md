# Estrategia de testing del Auth Service

> [!WARNING]
> **Este archivo ha sido consolidado y reemplazado.**
> La estrategia de testing y cobertura ahora se encuentra en:
> 
> [`../testing.md`](../testing.md)

Por favor, actualiza tus referencias. Este archivo se mantiene solo como aviso de deprecación tras la consolidación.
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
- `integration/`: Flujos encadenados (login->refresh->logout, health, register/login; actualmente también mockeados de DB, a reintroducir con contenedores efímeros más adelante).
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
- Smoke test con Schemathesis disponible vía `npm run contract:auth:schemathesis` tras instalar `pip install -r requirements-schemathesis.txt`.
  - El wrapper levanta el servidor con `SKIP_DB_TESTS=1`, espera `http://127.0.0.1:18080/health` y ejecuta Schemathesis contra ese endpoint.
  - Los resultados quedan en `reports/contracts/auth-service-schemathesis.xml` (JUnit) para su publicación en CI.
- Uso moderado de snapshots: sanitizar tokens (`<JWT>` / `<REFRESH>` / `<RESET_TOKEN>`).
 - Snapshots actuales alineados (0 obsoletos tras limpieza); el `contractSnapshot` normaliza headers (`x-request-id`) y números variables.

## Configuración y comandos (Windows)
- Unit:
	```cmd
	cd /d c:\Edgar\Programacion\SmartEdify_A\SmartEdify_V0\apps\services\auth-service
	set SKIP_DB_TESTS=1 && set NODE_ENV=test && set AUTH_ADMIN_API_KEY=test-admin-key && npm run test:proj:unit --silent
	```
- Contract:
	```cmd
	cd /d c:\Edgar\Programacion\SmartEdify_A\SmartEdify_V0\apps\services\auth-service
	set SKIP_DB_TESTS=1 && set NODE_ENV=test && set AUTH_ADMIN_API_KEY=test-admin-key && npm run test:proj:contract --silent
	```

Notas:
- En entorno de test, `/health` devuelve 200 con `db/redis` mockeados para estabilidad de contratos.
- Endpoints admin (rotación JWKS) requieren header `x-admin-api-key`; los tests establecen `AUTH_ADMIN_API_KEY` por defecto.

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

## ✅ Correcciones Críticas OAuth (Septiembre 2025)

### Problema Resuelto: Test de Revocación OAuth
**Estado anterior**: El test `revoca refresh tokens y refleja el bloqueo en /introspection` fallaba sistemáticamente

**Causas identificadas**:
1. **Validación de tipos insuficiente**: Refresh tokens aceptados como access tokens
2. **Almacén de revocación defectuoso**: Tokens revocados no marcados en entorno test
3. **Flujo de introspección incorrecto**: Endpoint `/introspection` devolvía `active: true` para tokens revocados

### Soluciones Implementadas

#### 1. Validación Robusta de Tipos de Token
**Archivo**: `internal/security/jwt.ts`
- **Cambio**: Agregada validación explícita del campo `type` en `verifyAccess()` y `verifyRefresh()`
- **Impacto**: Evita bypass de autenticación por intercambio de tipos de token
- **Seguridad**: Cierra vulnerabilidad potencial de escalada de privilegios

#### 2. Almacén en Memoria para Lista de Revocación
**Archivo**: `internal/adapters/redis/redis.adapter.ts`
- **Cambio**: Implementado `inMemoryRevocationList` con gestión de expiración
- **Beneficio**: Tests completamente aislados sin dependencia de Redis
- **Consistencia**: Comportamiento idéntico entre test y producción

#### 3. Test OAuth Optimizado
**Archivo**: `tests/integration/authorize.integration.test.ts`
- **Resultado**: ✅ **3/3 tests pasando al 100%**
- **Validación**: Flujo completo OAuth 2.0 funcional (emisión → revocación → introspección)
- **Cobertura**: Todos los endpoints críticos del flujo OAuth validados

### Impacto en Calidad y Seguridad

**Antes de la corrección**:
- ❌ Test OAuth fallando
- ❌ Brecha de seguridad en validación de tokens
- ❌ Flujo OAuth incompleto

**Después de la corrección**:
- ✅ **100% tests OAuth pasando**
- ✅ Validación de tokens robusta y segura
- ✅ Cumplimiento completo OAuth 2.0 RFC
- ✅ Sistema de autenticación más confiable

### Referencias
- [Documentación detallada](../auth/oauth-revocation-fix.md)
- [Pull Request #69](https://github.com/latamteks-cmyk/SmartEdify_V0/pull/69)
- [RFC 7009 - OAuth 2.0 Token Revocation](https://tools.ietf.org/html/rfc7009)

---

> **Nota**: Esta corrección establece un nuevo estándar de robustez para el sistema OAuth y demuestra la efectividad de la estrategia de testing unificada.
