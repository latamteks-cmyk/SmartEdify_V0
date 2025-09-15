# Gestión de credenciales Docker Hub

Este documento describe cómo configurar credenciales de Docker Hub de forma segura para construir y publicar imágenes de los servicios.

## 1. Variables de entorno

Añade en tu `.env` (NO commitear) lo siguiente (usa placeholders hasta tener valores reales):

```
DOCKERHUB_USERNAME=CHANGE_ME_DOCKER_USER
DOCKERHUB_TOKEN=CHANGE_ME_DOCKER_PAT
```

En `.env.example` deben mantenerse placeholders (`CHANGE_ME_...`) nunca credenciales reales.

## 2. Inicio de sesión local

```
docker login -u $Env:DOCKERHUB_USERNAME --password-stdin
```
Luego pega el token cuando lo pida (o haz un pipe):

```
$Env:DOCKERHUB_TOKEN | docker login -u $Env:DOCKERHUB_USERNAME --password-stdin
```

## 3. Uso en GitHub Actions

En el repositorio: Settings > Secrets and variables > Actions > New repository secret

Crea:
- `DOCKERHUB_USERNAME`
- `DOCKERHUB_TOKEN`

Luego en workflow (`.github/workflows/auth-service-ci.yml`), antes del build/push agrega un job step (idealmente en job separado `publish` que dependa de tests/security):

```yaml
- name: Docker login
  run: echo "${{ secrets.DOCKERHUB_TOKEN }}" | docker login -u "${{ secrets.DOCKERHUB_USERNAME }}" --password-stdin
```

## 4. Naming de imágenes

Esquema sugerido: `<org>/<service>:<semver>-<flavor>`

Ejemplos:
```
docker build -t $Env:DOCKERHUB_USERNAME/auth-service:0.1.0-dev .
docker build -t $Env:DOCKERHUB_USERNAME/auth-service:0.1.0-commit-$Env:GIT_SHORT_SHA .
```
Push:
```
docker push $Env:DOCKERHUB_USERNAME/auth-service:0.1.0-dev
```
Evita usar `latest` en despliegues productivos (solo sandbox manual).

## 5. SBOM y firma (roadmap)

Integrar en pipeline (futuro):
```
syft <image-ref> -o spdx-json > sbom.json
trivy image --exit-code 1 <image-ref>
cosign sign <image-ref>
```
Publicar `sbom.json` como artefacto y almacenar digest firmado.

## 6. Rotación de tokens

- Tokens deben rotarse al menos cada 90 días.
- Revoca inmediatamente un token comprometido desde Docker Hub > Security > Personal Access Tokens.

## 7. Buenas prácticas

- Nunca commitees `.env` reales.
- Mantén solo placeholders en `.env.example`.
- Limita permisos de PAT a lo estrictamente necesario (scope: read/write repos propios de imágenes necesarias).
- Revisa logs CI para asegurar que el login ocurre antes del push y que no se imprime el token.
- Evita echo del PAT sin pipe a `--password-stdin`.
- Implementa rotación automatizada documentada (task en backlog T2).

---
Última actualización: 2025-09-14 (ajustado placeholders / roadmap SBOM-firma)
