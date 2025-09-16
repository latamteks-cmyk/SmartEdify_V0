---
title: "ADR-0007: Rotación y Distribución de Claves JWT (JWKS)"
date: 2025-09-14
status: Propuesto
authors: [Equipo de arquitectura]

# ADR-0007: Rotación y Distribución de Claves JWT (JWKS)

## Tabla de Contenido
1. [Contexto](#contexto)
2. [Decisión](#decisión)
3. [Consecuencias y Criterios de Aceptación](#consecuencias-y-criterios-de-aceptación)
4. [Flujo de Rotación](#flujo-de-rotación)
5. [Ejemplo de Endpoint JWKS](#ejemplo-de-endpoint-jwks)
6. [Referencias](#referencias)

---

## 1. Contexto
El ecosistema requiere validar tokens en múltiples servicios (`tenant-service`, futuros servicios). Actualmente dependemos de una clave pública estática (`TENANT_JWT_PUBLIC_KEY`). Riesgos:
- Rotación manual lenta, provoca ventanas de uso de claves comprometidas.
- Revocación difícil de refresh tokens y sesiones asociadas.
- No existe endpoint JWKS para distribución automática.

## 2. Decisión
Implementar un Key Store interno gestionando un conjunto de claves (al menos 2 activas: `current`, `next`).

**Proceso:**
- Generación anticipada de nueva clave (RS256 inicialmente, contemplar ES256 posteriormente).
- Publicación en JWKS con `use: "sig"`, `alg: "RS256"`, `kid` único, sólo contenido de la parte pública.
- Al iniciar rotación: marcar `next` como `current` y generar una nueva `next`. Mantener la clave previamente usada durante un período de gracia (overlap) para validar tokens emitidos antes del switch.

**Refresh Tokens:**
- Guardar refresh tokens hash (argon2) + `kid` de la clave con la que se firmó el access token inicial.
- En rotación: invalidar refresh tokens con claves marcadas `retiring=true` si se detecta compromiso.
- Tabla `auth_refresh_sessions(id, user_id, kid, revoked_at, expires_at, metadata)`.

## 3. Consecuencias y Criterios de Aceptación
### Consecuencias
- Rotación de claves sin downtime.
- Revocación inmediata de refresh tokens asociados a compromisos o logout global.
- Auditoría de claves (`kid`, `created_at`, `last_used_at`).

### Criterios de aceptación
- [ ] El endpoint `/.well-known/jwks.json` expone siempre al menos dos claves activas (`current`, `next`).
- [ ] El proceso de rotación no interrumpe la validación de tokens emitidos previamente.
- [ ] Refresh tokens pueden ser revocados por `kid`.
- [ ] Auditoría de uso y rotación disponible.

## 4. Flujo de Rotación
1. Operación `rotateKeys` (manual o job) crea nueva clave -> almacena como `next`.
2. Después de ventana T (ej. 24h) se promueve `next` a `current`, la anterior `current` pasa a `retiring` (validar solamente, no firmar).
3. Pasado período de gracia (ej. 72h) las claves `retiring` se eliminan (o se archivan) y se invalidan refresh tokens asociados.

## 5. Ejemplo de Endpoint JWKS
`GET /.well-known/jwks.json` devuelve:

```json
{
  "keys": [
    {"kty": "RSA", "kid": "kidCurrent", "n": "<base64url>", "e": "AQAB", "alg": "RS256", "use": "sig"},
    {"kty": "RSA", "kid": "kidNext", "n": "<base64url>", "e": "AQAB", "alg": "RS256", "use": "sig"}
  ]
}
```

## 6. Referencias
- [Diagrama de secuencia de rotación JWKS](../diagrams/jwks-rotation-sequence.mmd)
- [Flujo de estados de JWKS](../diagrams/jwks-rotation-state.mmd)
- [ARCHITECTURE.md](../../../ARCHITECTURE.md)
- [OpenID Connect Discovery](https://openid.net/specs/openid-connect-discovery-1_0.html)
  ]
}
```
Claves en estado `retiring` pueden incluirse opcionalmente durante la fase de gracia para minimizar invalidaciones tempranas.

## Estrategia de Almacenamiento
Opciones:
- Base de datos (tabla `auth_signing_keys`): persistente, auditable.
- In-memory + backup: más simple pero menos resiliente.

Se elige base de datos PostgreSQL:
```
CREATE TABLE auth_signing_keys (
  kid TEXT PRIMARY KEY,
  pem_private TEXT NOT NULL,
  pem_public TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('current','next','retiring')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  promoted_at TIMESTAMPTZ NULL,
  retiring_at TIMESTAMPTZ NULL
);
```
Índice por `status` para consultas rápidas.

## Rotación Segura
- Verificar entropía mínima de clave y tamaño (>=2048 bits RSA).
- Registrar auditoría (quién solicitó rotación, motivo).
- Purgar claves retiradas sólo después de confirmación de no uso (último access token con ese kid expirado).

## Revocación y Compromiso
Si se sospecha compromiso de una clave:
1. Marcar `current` comprometida -> `retiring` inmediata y promover `next`.
2. Crear nueva `next`.
3. Invalidar refresh tokens emitidos con la clave comprometida (`UPDATE auth_refresh_sessions SET revoked_at=now() WHERE kid=...`).

## Backwards Compatibility
Clientes que cachean JWKS deben manejar expiración (Cache-Control: max-age=300). Recomendado ETag para 304.

## Métricas
- `jwks_keys_total{status}` número de claves por estado.
- `jwks_rotation_total` rotaciones realizadas.
- `jwks_refresh_revoked_total` refresh tokens invalidados por rotación/compromiso.

## Riesgos
- Desfase de reloj entre servicios: mitigado con período de gracia.
- Cache agresivo en clientes: controlar con headers adecuados.
- Crecimiento de tabla si no se purga: job de limpieza.

## Alternativas
- KMS externo (AWS KMS / GCP KMS): más seguridad pero añade complejidad inicial.
- JWK estático en archivo: no soporta rotación sin despliegue.

## Próximos Pasos
1. Implementar tabla y repositorio claves.
2. Endpoint JWKS.
3. Comando/endpoint admin rotación.
4. Integrar con emisión de tokens para incluir `kid`.
5. Métricas Prometheus.

## Referencias
- RFC 7517 (JSON Web Key)
- RFC 7515 (JWS)
- OWASP JWT Cheat Sheet
