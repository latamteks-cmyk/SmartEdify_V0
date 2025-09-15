# Estrategia de testing del Auth Service

Esta guía recoge la arquitectura de pruebas multi-proyecto y los compromisos de cobertura para el servicio de autenticación.

## Objetivos transversales de calidad
- Cobertura mínima actual: 60 % en `internal/app` y adaptadores críticos.
- Meta de mediano plazo: ≥80 % incluyendo dominio.
- Se incorporará una métrica adicional sobre rutas HTTP críticas (login, refresh, reset).

## Arquitectura de proyectos Jest
Tres proyectos declarados en `jest.config.js`:
1. `security`: pruebas focalizadas en generación/validación de tokens y rotación (con *mocks* controlados de DB y Redis).
2. `unit`: lógica pura sin efectos secundarios; será el destino del refactor de `internal/app`.
3. `integration`: ejecuta contra Postgres real (migraciones aplicadas en el *setup* global) y Redis simulado en memoria.

## Política de mocks
- En `integration` no se *mockea* `pg` para validar SQL real y transacciones.
- `ioredis` se redirige mediante `moduleNameMapper` a un *mock* único extendido (`set/get/del/incr/expire/ttl`).
- Se eliminó duplicidad de *mocks* (`__mocks__/ioredis.ts` vs `tests/__mocks__/ioredis.ts`) usando `modulePathIgnorePatterns`.
- Todo nuevo *mock* debe documentarse en el README del servicio antes de introducirse.

## Datos y aislamiento en pruebas
- Correos electrónicos se generan con sufijo aleatorio para evitar colisiones únicas en la base de datos.
- Coste Argon2id reducido en entorno de test (`t=2, m=4096, p=1`) para acelerar la ejecución.
- Limpieza y cierre de recursos en `afterAll` (pool de Postgres, Redis *mock*, *register* de métricas OTel/Prometheus).

## Cobertura y métricas de calidad
- Se instrumentarán contadores `test_flaky_detected_total` (incrementa cuando una re-ejecución pasa tras un fallo intermitente).
- Histograma `test_duration_seconds{project}` para detectar regresiones de rendimiento.

## Contratos y *snapshots*
- Próximo hito: pruebas de contrato HTTP generadas desde OpenAPI y validadas con Spectral antes del *merge*.
- Los *snapshots* almacenan respuestas sanitizadas (tokens reemplazados por `<JWT>` / `<REFRESH>`).

## Dependencias de seguridad antes de ampliar autenticación avanzada
1. Implementar y validar rotación JWKS mediante pruebas `integration` y `security`.
2. Métricas y alertas para detección de reutilización de *refresh tokens*.
3. Estabilizar el contrato OpenAPI del servicio de autenticación (lint + ejemplos) para habilitar contract tests.
