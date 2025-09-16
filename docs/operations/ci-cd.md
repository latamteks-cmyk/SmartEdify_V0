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

### `sbom` / `supply-chain`
- Tras construir las imágenes `smartedify/<service>:ci`, la CI genera SBOM en formatos CycloneDX y SPDX utilizando **Syft** y **Trivy**. Todo queda publicado como artefacto `supply-chain-artifacts` junto con los *digests*, firmas y attestations de **Cosign**.
- Descarga de artefactos para una `run` concreta:
  ```bash
  gh run download <run-id> --name supply-chain-artifacts --dir artifacts/supply-chain
  tree artifacts/supply-chain
  ```
- Validación rápida de SBOM (ejemplo con Auth Service y Syft/CycloneDX):
  ```bash
  jq '.metadata.component | {name, version}' \
    artifacts/supply-chain/sboms/syft/auth-service/syft-auth-service-cyclonedx.json
  jq '.packages | map({name, version})[:5]' \
    artifacts/supply-chain/sboms/trivy/auth-service/trivy-auth-service-spdx.json
  ```
- Verificación de firma de imagen (requiere reconstruir la misma imagen o cargarla con `docker load` y Cosign ≥ 2.1):
  ```bash
  export COSIGN_EXPERIMENTAL=1 COSIGN_YES=true
  DIGEST=$(cat artifacts/supply-chain/digests/auth-service.txt)
  cosign verify --offline \
    --certificate artifacts/supply-chain/signatures/auth-service/image.pem \
    --signature artifacts/supply-chain/signatures/auth-service/image.sig \
    "${DIGEST}"
  ```
- Validación de la attestation CycloneDX asociada al SBOM (devuelve el DSSE para inspección):
  ```bash
  cosign verify-attestation --offline --type cyclonedx \
    --certificate artifacts/supply-chain/attestations/auth-service/cyclonedx.pem \
    --signature artifacts/supply-chain/attestations/auth-service/cyclonedx.sig \
    "${DIGEST}" > artifacts/supply-chain/attestations/auth-service/cyclonedx.verified.intoto.jsonl
  jq '.payload | @base64d | fromjson | {predicateType, subject}' \
    artifacts/supply-chain/attestations/auth-service/cyclonedx.verified.intoto.jsonl
  ```
- Ante discrepancias entre Syft/Trivy o firma inválida, bloquear el release y notificar a `#oncall-plataforma`.

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
