# CI/CD y operación

> **Propósito:**
> Definir el flujo de integración y despliegue continuo, controles de calidad y criterios de éxito para todos los servicios SmartEdify.

> **Referencias:**
> - ADR: [ADR-0006-tracing.md](../design/adr/ADR-0006-tracing.md)
> - Diagrama: [architecture-overview.mmd](../design/diagrams/architecture-overview.mmd)
> - Dashboards: [Grafana CI/CD](https://grafana.smartedify.internal/d/cicd)

## Gates obligatorios (activos hoy)
- `lint`, `typecheck`, `test:unit`, `test:contract` (por servicio; integración si aplica)
- Validación de diagramas Mermaid (render/syntax OK)
- Lint de OpenAPI con Spectral

Estos gates están implementados en los workflows actuales del monorepo (ver sección "Workflows").

## Gates planificados (roadmap)
- `coverage` ≥ 80 % como gate bloqueante
- `sast` (escaneo estático) bloqueante
- `sbom` + firmas y attestations con Cosign (ver sección de supply-chain más abajo)
- `container:scan` (Trivy) bloqueante
- `secret-scan` (Gitleaks)

### `secret-scan` (planificado)
- Detecta *leaks* y credenciales accidentales utilizando [Gitleaks](https://github.com/gitleaks/gitleaks).
- El pipeline sube los resultados en formato SARIF a Code Scanning y bloquea el merge si el job falla.
- Para reproducirlo localmente desde la raíz del repo:
  ```bash
  docker run --rm -v "$(pwd)":/repo -w /repo zricethezav/gitleaks:latest \
    detect --report-format sarif --report-path gitleaks.sarif
  ```
  El archivo `gitleaks.sarif` puede abrirse con VS Code o subirse manualmente a GitHub Code Scanning para revisión.

### `sbom` / `supply-chain` (planificado)
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
- La verificación (`cosign verify` + `cosign verify-attestation`) es bloqueante en la CI antes de publicar/push de imágenes; si
  cualquiera de las firmas o attestations falla la tubería se detiene y se notifica a `#oncall-plataforma`.
- Ante discrepancias entre Syft/Trivy o firma inválida, bloquear el release y notificar a `#oncall-plataforma`.

## Ejecución local rápida

Para reproducir los gates principales localmente:

- Tests (cross-platform):
  ```bash
  npm run test:fast
  npm run test:contract
  npm run test:all
  ```
  - El wrapper `scripts/run-test-suite.mjs` detecta automáticamente el sistema operativo y delega en los scripts internos (`test:<suite>:win|nix`).
- OpenAPI lint (Spectral):
  ```bash
  npm run lint:openapi
  ```
- Validación Mermaid: se ejecuta en CI; localmente usar la previsualización de Mermaid del editor para revisar cambios antes del PR.

## Workflows
- `/.github/workflows/ci-quality.yml`: gates globales (typecheck, lint, tests, Mermaid, Spectral).
- `/.github/workflows/tenant-service-ci.yml`: quality (lint/typecheck) y build de imagen para tenant-service.
- Otros workflows específicos por servicio pueden añadirse conforme evolucione el roadmap.

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

### Promoción Auth Service (staging → producción)
1. **Prerequisitos:**
   - Pipeline `ci.yml` en verde, incluyendo gates de supply-chain (firmas/attestations verificadas) y escaneos Trivy.
   - Snapshot SBOM (`supply-chain-artifacts`) adjunto al run y validado en equipo de seguridad.
   - Ticket de cambio aprobado con ventana y responsables (`CAB` o equivalente).
2. **Promoción a staging:**
   ```bash
   ./scripts/deploy.sh --service auth-service --environment staging --ref <sha>
   ./scripts/smoke-test.sh --service auth-service --environment staging
   ```
   - Confirmar métricas claves (`auth_login_success_total`, `error_rate`, `latency_p95`).
   - Revisar dashboards Grafana `Auth · SLO` y alertas pendientes.
3. **Go/No-Go:**
   - Checklist de verificación firmado por dueños de producto y on-call plataforma.
   - Confirmar que `cosign verify` y `verify-attestation` en staging apuntan al mismo digest publicado.
  - Confirmar suites sin warnings (Jest) y snapshots sin obsoletos.
4. **Promoción a producción:**
   ```bash
   ./scripts/deploy.sh --service auth-service --environment production --ref <sha>
   ./scripts/smoke-test.sh --service auth-service --environment production
   ```
   - Ejecutar post-deploy `kubectl rollout status deploy/auth-service -n auth`.
   - En los primeros 15 minutos monitorizar alertas `AuthLoginErrorRate` y `AuthJWKSRotationMissingNext`.
5. **Cierre:**
   - Registrar digest desplegado, hora y responsables en el ticket.
   - Adjuntar evidencias de dashboards y `kubectl get pods`.

### Rollback Auth Service
1. **Criterios de activación:** alertas críticas sostenidas, p95 > objetivo, tasa de errores > 5 %, falla en verificación de fir
   mas/attestations en ambiente destino o incidentes de seguridad.
2. **Ejecución rápida:**
   ```bash
   ./scripts/deploy.sh --service auth-service --environment <staging|production> --ref <sha_anterior>
   ./scripts/smoke-test.sh --service auth-service --environment <staging|production>
   ```
   - Confirmar que la imagen revertida mantiene firmas/attestations válidas (`cosign verify --offline <digest_anterior>`).
3. **Rotación JWKS / tokens:** si la causa es relacionada a claves, seguir `docs/operations/incident-auth-key-rotation.md`.
4. **Comunicación:** notificar a `#oncall-plataforma`, `#auth-service` y registrar postmortem.
5. **Post-rollback:**
   - Ejecutar validación extendida (`/metrics`, dashboards, logs).
   - Actualizar `docs/status.md` y `task.md` con la lección aprendida y estado del release.
  - Re-ejecutar suites unit/contract en el commit revertido.

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
