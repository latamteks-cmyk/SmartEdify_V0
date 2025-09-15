# CI/CD y operaciones

Lineamientos para ejecutar el pipeline de entrega continua y las actividades operativas asociadas.

## Objetivos
- Garantizar calidad de código mediante verificaciones automáticas obligatorias.
- Desplegar con seguridad y capacidad de rollback rápido.
- Mantener visibilidad operativa y respuesta ante incidentes.

## Pipeline de calidad
- Gates obligatorios: `lint`, `typecheck`, `test:unit`, `test:int`, `openapi:lint`, `sbom`, `sast`, `container:scan`.
- Cobertura mínima del 80 % en servicios críticos; reportes se publican en cada PR.
- Contract tests validan `operationId` definidos en OpenAPI y esquemas de eventos.
- Releases requieren firma del equipo de plataforma tras verificar rotación JWKS y dependencias actualizadas.

## Seguridad en la cadena de suministro
- Scans recurrentes con Dependabot, CodeQL, Trivy y Syft.
- Bloqueo de PRs con vulnerabilidades críticas o licencias no permitidas.
- Gestión de secretos en GitHub Secrets y AWS Secrets Manager; nunca se almacenan secretos en repositorios.

## Estrategia de despliegue
- Despliegues *canary* por servicio con *feature flags* para limitar exposición.
- *Rollback* automático ante aumentos de error rate o latencia p95 fuera de SLO.
- Politicas de CORS y *security headers* validadas en pipeline antes de promover a producción.

## Monitoreo y alertas
- Definir SLI/SLO por servicio y documentarlos en runbooks.
- Alertas críticas: error rate, latencia p95, respuestas 5xx, *consumer lag* y mensajes en DLQ por encima del umbral.
- Exportar métricas, logs y trazas hacia el Collector OTLP para visualización unificada.

## Operación diaria
- Runbooks obligatorios para DLQ (`dlq.<service>`) con reintentos exponenciales y *jitter*.
- Revisiones semanales de rotación JWKS y estado de claves (`/.well-known/jwks.json`).
- Actualización continua de `docs/documento-rector.md`, `ARCHITECTURE.md` y dashboards de observabilidad dentro del flujo de PR.
