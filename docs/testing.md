# Estrategia Unificada de Testing

## Índice
- [Principios generales y objetivos de calidad](#principios-generales-y-objetivos-de-calidad)
- [Cobertura y métricas](#cobertura-y-métricas)
- [Arquitectura de proyectos y tipos de pruebas](#arquitectura-de-proyectos-y-tipos-de-pruebas)
- [Política de mocks y aislamiento](#política-de-mocks-y-aislamiento)
- [Contratos y contract testing](#contratos-y-contract-testing)
- [Patrones cross-service y mejores prácticas](#patrones-cross-service-y-mejores-prácticas)
- [Comandos y configuración](#comandos-y-configuración)
- [Evolución y roadmap de la suite](#evolución-y-roadmap-de-la-suite)
- [Referencias y enlaces útiles](#referencias-y-enlaces-útiles)

---

## Principios generales y objetivos de calidad
- Cobertura mínima actual: 60 % en módulos críticos; meta ≥80 %.
- Métricas adicionales sobre rutas HTTP críticas y flujos sensibles.
- Calidad transversal: detección de flakiness, duración de tests, thresholds progresivos.

## Cobertura y métricas
- Instrumentación de contadores para flakiness (`test_flaky_detected_total`) y duración (`test_duration_seconds{project}`).
- Reporte de cobertura integrado al pipeline CI/CD.
- Métricas específicas para eventos de seguridad y flujos sensibles.

## Arquitectura de proyectos y tipos de pruebas
- Proyectos separados para unit, integration y security.
- Unit: lógica de flujo y handlers, mocks completos de dependencias.
- Integration: flujos encadenados, a futuro con contenedores efímeros.
- Security: JWT, rotación de claves, validaciones de JWKS.
- Eliminación de duplicados y suites obsoletas documentada.

## Política de mocks y aislamiento
- Mocks deterministas para DB/Redis (`__mocks__/pg.adapter.ts`, mock de `ioredis`).
- Emails dinámicos y reducción de coste Argon2id para acelerar tests.
- Sin conexiones reales en CI para máxima estabilidad y velocidad.
- Todo nuevo mock debe documentarse y mantenerse actualizado.

## Contratos y contract testing
- Pruebas de contrato HTTP desde OpenAPI usando Spectral + Schemathesis.
- Smoke test disponible vía `npm run contract:<servicio>:schemathesis`.
- Resultados en `reports/contracts/<servicio>-schemathesis.xml` (JUnit) para CI.
- Uso de snapshots para normalizar tokens y headers variables.
- Validación de rutas críticas y cobertura de contratos.

## Patrones cross-service y mejores prácticas
- Documentar patrones de pruebas reutilizables entre servicios.
- Recomendaciones para cobertura mínima y thresholds por tipo de servicio.
- Estrategias para pruebas de integración real y contract testing multi-servicio.

## Comandos y configuración
- Ejemplo unit (Windows):
  ```cmd
  cd /d <ruta-servicio>
  set SKIP_DB_TESTS=1 && set NODE_ENV=test && set AUTH_ADMIN_API_KEY=test-admin-key && npm run test:proj:unit --silent
  ```
- Ejemplo contract:
  ```cmd
  cd /d <ruta-servicio>
  set SKIP_DB_TESTS=1 && set NODE_ENV=test && set AUTH_ADMIN_API_KEY=test-admin-key && npm run test:proj:contract --silent
  ```
- Notas: endpoints admin requieren header especial; mocks activos en entorno de test.

## Evolución y roadmap de la suite
| Fase | Objetivo | Cambio clave |
|------|----------|--------------|
| F1 | Estabilización aislada | Mocks completos DB/Redis |
| F2 | Validación estructural | Integration real con contenedores |
| F3 | Contratos | OpenAPI + Schemathesis + Spectral gating |
| F4 | Seguridad avanzada | Reuse detection + MFA tests |
| F5 | Rendimiento | k6 para p95 login/refresh + profiling |

## Referencias y enlaces útiles
- [Estrategia Auth Service](testing/auth-service-strategy.md)
- [Especificación API](spec.md)
- [Guía OpenAPI](openapi-guidelines.md)
- [Plano técnico backend](architecture/backend-blueprint.md)
- [Runbooks y operación](runbooks/)

---
> **Nota:** Tras la consolidación, los archivos individuales de estrategia de testing serán eliminados o referenciados solo desde este documento.