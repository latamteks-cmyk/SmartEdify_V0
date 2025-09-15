# Registro de decisiones técnicas recientes

| Fecha | Decisión | Impacto |
|-------|----------|---------|
| 2025-09-14 | Unificar mock Redis vía mapper | Eliminación de flakiness en pruebas de integración |
| 2025-09-14 | Eliminar mock `pg` en security/integration | Validación con base de datos real en flujos críticos |
| 2025-09-15 | Priorizar JWKS sobre WebAuthn | Reduce riesgo asociado a rotación manual de claves simétricas |
| 2025-09-15 | Añadir *teardown* explícito de Pool/Redis | Previene fugas de *handles* en Jest |
| 2025-09-15 | Introducir roadmap de métricas de negocio | Base para alertas tempranas ante abuso |
