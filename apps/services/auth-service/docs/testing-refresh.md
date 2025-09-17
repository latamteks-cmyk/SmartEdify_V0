# Auth Service - Estrategia de Testing de Refresh Tokens

## Objetivo
Validar la cadena de rotación de refresh tokens y el bloqueo de reutilización sin depender de Postgres ni Redis reales, garantizando firmas RS256 válidas.

## Componentes Mock
- **DB (@db/pg.adapter)**: Mock in-memory (`__mocks__/pg.adapter.ts`) que:
  - Guarda usuarios, roles y signing keys en arrays.
  - Genera automáticamente una clave RSA 2048 (estado `current`) si no existe.
  - Implementa `query` con coincidencias por fragmentos para soportar SQL usado en `keys.ts`.
- **Hashing**: Mock de `hashPassword` y `verifyPassword` en `tests/jest.setup.ts` que genera hashes `mock$<plain>` y compara por substring, acelerando tests.
- **Redis**: Mock in-memory simple (`MockRedis`) que implementa `set/get/del/expire/incr` y almacenamiento TTL para refresh tokens y revocaciones.
- **JWT Keys**: `keys.ts` usa `generateKeyPairPem()` que en test retorna un par estático si se invoca directamente. El mock DB usualmente evita esa ruta generando la clave RSA en su semilla.

## Flujo de Refresh Producido
1. Usuario hace `POST /login` -> `issueTokenPair()` emite Access y Refresh (RS256, `kid` de clave current).
2. Cliente llama `POST /refresh-token` enviando el refresh actual.
3. `rotateRefresh()` valida el token, verifica no revocado ni rotado:
   - Marca el refresh como revocado y rotado (in-memory + Redis mock).
   - Emite nuevo par de tokens.
4. Segundo intento de usar el refresh antiguo -> retorna `null` y el handler responde `401`.
5. Se puede encadenar repetidamente; cada refresh sólo se acepta una vez.

## Test `refresh.test.ts`
Cobertura:
- Éxito de primera rotación.
- Diferencia de tokens (cambian access y refresh).
- Reutilización del refresh anterior produce 401.
- Reutilización del refresh ya rotado (segundo refresh) también bloqueada.

## Métricas
- `auth_refresh_rotated_total`: incrementa en rotación exitosa.
- `auth_refresh_reuse_blocked_total`: incrementa en reuse bloqueado (el test actual verifica vía status 401, no asserta métricas directamente).

## Consideraciones de Diseño
- No se lanzan timeouts en test para limpieza de estados (evita handles abiertos).
- Claves RSA: no se fuerza regeneración en cada test -> más rápido y determinista.
- Mock `query` minimalista: si se amplía SQL real, actualizar patrones.

## Extensiones Futuras
- Test para `/admin/rotate-keys` verificando estados `current` -> `retiring` y promoción de `next`.
- Test para validación JWKS (`/.well-known/jwks.json`).
- Tests forgot/reset password con mock de correo (captura de token en memoria).

## Troubleshooting Rápido
| Síntoma | Causa probable | Acción |
|--------|----------------|--------|
| `secretOrPrivateKey must be an asymmetric key` | PEM truncado o mock sembró claves dummy (`priv`/`pub`) | Confirmar seeding eliminado y generación RSA activa en mock |
| Reutilización de refresh no bloqueada | Falta de revocación in-memory o mock redis no persiste | Revisar `rotateRefresh` y mocks de redis adapter |
| Test se cuelga | Timeout por handles (setTimeout rotación) habilitado | Verificar condición `NODE_ENV==='test'` en `rotateRefresh` |

## Buenas Prácticas
- Mantener `AUTH_TEST_LOGS` desactivado salvo depuración puntual.
- Añadir nuevas rutas primero en test para mantener cobertura (TDD ligero).
- Evitar lógica condicional basada en tiempo real en tests; preferir parámetros controlados.

---
Última actualización: 2025-09-16.
