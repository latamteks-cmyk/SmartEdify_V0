# Hardening de seguridad

## Contenedores
- `USER` no root, FS `read_only`, `tmpfs` para `/tmp`.
- *Seccomp* y *AppArmor* perfiles restrictivos.

## Comms
- CORS: solo `https://smart-edify.com` y `https://www.smart-edify.com`.
- mTLS interno entre gateway y microservicios (fase posterior).

## Autenticación y autorización
- Rotación de JWKS programada y de emergencia.
- Revocación de *refresh tokens* y *token introspection* para admins.

## Dependencias y CI
- Dependabot, CodeQL, Trivy, Syft. Bloquear PRs con vulnerabilidades críticas.

## Política de contraseñas y secretos
- Longitud mínima 16. Rotación 90 días si aplica. Nunca en repositorio.
