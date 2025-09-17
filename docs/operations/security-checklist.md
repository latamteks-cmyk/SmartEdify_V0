# Checklist Operativo de Seguridad – Auth Service

Última actualización: 2025-09-22

## Controles obligatorios
- [x] Rotación dual de claves JWKS documentada y ejercitada (current/next/retiring + runbook en operaciones).
- [x] Token introspection habilitado para administradores (scope `admin:tokens`, auditoría de solicitudes y rate limiting dedicado).
- [x] Revocación explícita de tokens con deny-list corta para access/refresh (logout, revocation endpoint y automatización por `kid`).
- [x] Registro de eventos de seguridad crítico (`auth.logout`, `auth.token.revoked`, `auth.refresh.reuse_detected`).
- [ ] Validación continua de dependencias (Trivy, CodeQL, Gitleaks) integrada en pipeline bloqueante.

## Procedimientos relacionados
- Ejecutar el [runbook de rotación JWKS](incident-auth-key-rotation.md) ante compromisos o rotaciones periódicas.
- Revisar trimestralmente métricas `auth_token_revoked_total` e `auth_refresh_reuse_blocked_total` para ajustar umbrales de alerta.
- Confirmar que `/introspection` responde solo a clientes administradores mediante `client_id` registrado y secretos rotados.

> Mantén este checklist sincronizado con los hallazgos del equipo de seguridad y actualiza los estados tras cada auditoría.
