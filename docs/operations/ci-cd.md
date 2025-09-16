# CI/CD y operación

> **Propósito:**
> Definir el flujo de integración y despliegue continuo, controles de calidad y criterios de éxito para todos los servicios SmartEdify.

> **Referencias:**
> - ADR: [ADR-0006-tracing.md](../design/adr/ADR-0006-tracing.md)
> - Diagrama: [architecture-overview.mmd](../design/diagrams/architecture-overview.mmd)
> - Dashboards: [Grafana CI/CD](https://grafana.smartedify.internal/d/cicd)

## Gates obligatorios
- `lint`, `typecheck`, `test:unit`, `test:int`, `openapi:lint`, `sbom`, `sast`, `container:scan`, `secret-scan`.

### `secret-scan`
- Detecta *leaks* y credenciales accidentales utilizando [Gitleaks](https://github.com/gitleaks/gitleaks).
- El pipeline sube los resultados en formato SARIF a Code Scanning y bloquea el merge si el job falla.
- Para reproducirlo localmente desde la raíz del repo:
  ```bash
  docker run --rm -v "$(pwd)":/repo -w /repo zricethezav/gitleaks:latest \
    detect --report-format sarif --report-path gitleaks.sarif
  ```
  El archivo `gitleaks.sarif` puede abrirse con VS Code o subirse manualmente a GitHub Code Scanning para revisión.

## Estrategia de despliegue
- *Canary* por servicio con *feature flags*.
- *Rollback* automático ante aumento de error rate o latencia p95.
- **Rollback manual:**
  1. Identifica el commit estable anterior en el pipeline.
  2. Despliega usando el tag o SHA correspondiente:
     ```bash
     ./scripts/deploy.sh --service <nombre> --ref <sha/tag>
     ```
  3. Verifica que los pods y endpoints estén saludables (`kubectl`, `/healthz`).
  4. Notifica en `#oncall-plataforma` y documenta el incidente.

## Validación post-despliegue
- SLI/SLO por servicio. Alertas: error rate, p95, 5xx, *consumer lag*, DLQ > umbral.
- Validar que no existan nuevas alertas críticas en los dashboards durante al menos 15 minutos tras el despliegue.
- Ejecutar pruebas de smoke test:
  ```bash
  ./scripts/smoke-test.sh --service <nombre>
  ```

## Contactos
- **On-call Plataforma:** `#oncall-plataforma` / oncall@smartedify.com
- **DevOps:** devops@smartedify.com
