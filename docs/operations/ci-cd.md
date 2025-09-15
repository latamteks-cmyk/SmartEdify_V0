# CI/CD y operación

## Gates
- `lint`, `typecheck`, `test:unit`, `test:int`, `openapi:lint`, `sbom`, `sast`, `container:scan`.

## Estrategia de despliegue
- *Canary* por servicio con *feature flags*.
- *Rollback* automático ante aumento de error rate o latencia p95.

## Monitoreo y alertas
- SLI/SLO por servicio. Alertas: error rate, p95, 5xx, *consumer lag*, DLQ > umbral.
