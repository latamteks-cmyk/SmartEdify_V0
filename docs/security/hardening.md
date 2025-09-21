# Hardening de Seguridad

## Contenedores
- Ejecutar como usuario no root (`USER` no root), sistema de archivos en modo solo lectura (`read_only`), y `tmpfs` para `/tmp`.
- Aplicar perfiles restrictivos de *Seccomp* y *AppArmor*.

## Comunicaciones
- CORS restringido a `https://smart-edify.com` y `https://www.smart-edify.com`.
- mTLS interno entre gateway y microservicios (planificado para fases posteriores).

## Autenticación y autorización
- Rotación programada y de emergencia de JWKS.
- Revocación de *refresh tokens* y uso de *token introspection* para administradores.

## Dependencias y CI
- Uso de Dependabot, CodeQL, Trivy y Syft para escaneo de dependencias y contenedores.
- Bloqueo de PRs con vulnerabilidades críticas detectadas.

## Contraseñas y secretos
- Longitud mínima de contraseñas: 16 caracteres.
- Rotación de contraseñas cada 90 días si aplica.
- Prohibido almacenar secretos en el repositorio.

---
> Este documento consolida y reemplaza la información previa de docs/security-hardening.md. Todas las referencias deben apuntar aquí.