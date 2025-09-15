# Runbook — Rotación de claves (Auth)

1. Generar `next` y publicar en JWKS.
2. Esperar propagación 10 min.
3. Promover `next`→`current`.
4. Marcar antigua como `retiring`. Mantener 24 h.
5. Revocar *refresh tokens* emitidos antes de `current`.
6. Verificar métricas de verificación por `kid`.
