# ADR-20250914: Hashing Argon2id y Separación Access/Refresh Tokens

## Contexto
El Auth Service necesitaba un mecanismo seguro de almacenamiento de contraseñas y un esquema de emisión de tokens que permita control de sesión, rotación y futura detección de reuse. La versión inicial usaba una aproximación simple sin rotación robusta.

## Decisión
1. Usar Argon2id para hashing de contraseñas.
2. Separar Access Token (vida corta) de Refresh Token (rotación controlada) con TTLs distintos.
3. Rotar refresh token en cada uso (one-time) y marcar el anterior como inválido (in-memory + Redis `rotated:<jti>` en entorno distribuido).
4. Exponer métricas de rotación y reuse bloqueado: `auth_refresh_rotated_total`, `auth_refresh_reuse_blocked_total`.

## Razones
- Argon2id es actualmente recomendado (resistencia GPU / side-channel) frente a bcrypt.
- Separación Access/Refresh reduce la superficie de ataque: comprometer Access token caduca rápido; Refresh rota y acota movimiento lateral.
- Rotación obligatoria simplifica revoke chain futura y habilita detección de reuse (indicador de posible exfiltración).
- Métricas permiten observabilidad y alertas tempranas.

## Alternativas Evaluadas
- BCrypt + Refresh estático: descartado por menor resistencia y mayor ventana de abuso.
- Session store stateful (solo cookies): limita clientes móviles / integraciones.
- Pasar directamente a OIDC completo (JWKS + introspection): excede alcance MVP y retrasa endurecimiento básico.

## Consecuencias
Positivas:
- Mayor seguridad de credenciales y sesiones.
- Base lista para introducir reuse detection distribuida y revoke cascade.
Negativas / Costos:
- Complejidad extra en pruebas (necesidad de store in-memory para tokens y rotated markers).
- Costo computacional Argon2 en producción (mitigado ajustando parámetros por ambiente).

## Estado
Accepted / Implemented (MVP). Próximo: KMS para llaves JWT, reuse detection avanzada, OIDC endpoints.

## Métricas Relacionadas
- `auth_login_success_total`
- `auth_login_fail_total`
- `auth_password_reset_requested_total`
- `auth_password_reset_completed_total`
- `auth_refresh_rotated_total`
- `auth_refresh_reuse_blocked_total`

## Próximos Pasos
1. Añadir JWKS + rotación de claves asimétricas.
2. Implementar reuse detection family-wide (revocar cadena ante reuse).
3. Registrar eventos de seguridad en outbox (`RefreshReuseDetected`).
4. Publicar OpenAPI formal Auth e integrar con gateway.
