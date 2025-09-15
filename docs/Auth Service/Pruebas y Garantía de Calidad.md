## Estrategia de Pruebas — Auth Service

### Objetivo
Asegurar que el núcleo de autenticación (registro, login, rotación refresh, recuperación de contraseña) es determinista, seguro y observable antes de extender a OIDC completo.

### Niveles de Prueba
| Nivel | Estado Actual | Cobertura Objetivo | Notas |
|-------|---------------|--------------------|-------|
| Unit | Parcial (helpers hashing/jwt no aislados) | ≥70% etapa T1 | Extraer lógica de handlers a capa `internal/app` para aislar |
| Integración | 100% flujos básicos (10 tests) | Mantener verde y ampliar | Cubre register, login, refresh, forgot/reset |
| Contrato | No implementado | Definir tras OpenAPI stub | Usar Prism / Schemathesis |
| E2E (gateway) | No | Planificado post-OIDC | Simular validación JWT externa |
| Seguridad | Manual ad-hoc | Chequeos automatizados básicos | Linter secretos + dependencias + brute force guard |

### Flujos Cubiertos (Integración)
- Registro nuevo usuario (email único).
- Login correcto (emisión access+refresh).
- Login fallo (password incorrecta) y rate limiting progresivo.
- Refresh token rotación básica.
- Forgot password → reset password (token válido, luego token consumido no reutilizable).

### Flujos Pendientes
- Reuse detection de refresh (escenario ataque con RT antiguo).
- Expiración de refresh y rechazo (simulación TTL).
- Revocación manual /logout (cuando se implemente endpoint).
- Auditoría de eventos seguridad.
- MFA (cuando se implemente).

### Datos de Prueba
- Emails dinámicos por test (`test-${timestamp}@example.com`) para evitar colisiones 409.
- Password fija con complejidad suficiente.
- Reset token capturado desde fallback in-memory (solo entorno test).

### Aislamiento y Determinismo
| Recurso | Técnica | Beneficio |
|---------|--------|-----------|
| Redis | Mock compartido (`__mocks__/ioredis`) | Estado consistente entre instancias |
| Argon2 | Cost reducido (timeCost menor) | Menor tiempo total test suite |
| Base de datos | Truncate/rollback estrategia (pendiente refactor) | Evitar contaminación entre casos |
| Logging | Deshabilitar pino-http en test | Menos ruido y fallos intermitentes |

### Métricas de Calidad (a introducir)
- `tests_total`, `tests_failed_total` exportadas en job summary CI.
- Histórico de duración suite (detectar regresiones >20%).
- Gate de cobertura incremental (>70% T1, >80% T2).

### Seguridad (Checks Automatizables Planificados)
| Check | Herramienta | Estado |
|-------|-------------|--------|
| Dependencias vulnerables | `npm audit` / Trivy fs | Pendiente integrar CI |
| Secret scanning | Gitleaks | Pendiente |
| Lint seguridad (regex tokens) | Script custom | Pendiente |
| Reuse detection refresh | Test integración negativo | Pendiente |

### Plan de Incrementos de Prueba
1. Añadir test rotación negativa (old refresh inválido) tras instrumentar estado interno.
2. Extraer lógica de handlers → servicios (`internal/app`) y crear unit tests puras.
3. OpenAPI stub → tests de contrato (prism + schema validation).
4. Introducir cobertura y umbral gate en CI.
5. Simular expiraciones (manipular claims / overrides tiempo) para AT/RT.

### Riesgos QA Actuales
| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| Lógica de negocio mezclada en handlers | Dificulta unit tests | Refactor hacia capa app/service |
| Sin coverage report | Ciego a regresiones de cobertura | Añadir `jest --coverage` y publicar badge |
| Falta pruebas de error path | Falsos positivos en salud | Añadir casos: usuario inexistente, token corrupto, expirado |
| Sin pruebas de carga | Desconocemos p95 bajo estrés | Integrar k6/gatling mínimo tras estabilizar API |

### Herramientas Actuales
- Jest (serial, runInBand)
- Supertest para HTTP
- ioredis mock compartido
- Argon2 (parámetros controlados)

### Métricas QA (Futuro)
| Métrica | Objetivo | Uso |
|---------|----------|-----|
| p95 login | <120ms (MVP) | Seguimiento performance |
| Éxito login ratio | >95% | Alertar anomalías |
| Fallos refresh ratio | <1% | Detectar reuse / corrupción |

### Checklist Pre-Release (MVP)
- [ ] Test negativo rotación refresh
- [ ] Reporte cobertura
- [ ] OpenAPI stub generado
- [ ] Scripts de migración auditados
- [ ] Métricas negocio implementadas

### Próximos Pasos Inmediatos
1. Instrumentar counters negocio.
2. Añadir test rotación refresh negativo.
3. Publicar coverage y gate.

Documento vivo — actualizar al cerrar cada sprint / milestone de seguridad.

