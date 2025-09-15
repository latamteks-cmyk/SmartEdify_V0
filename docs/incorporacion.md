# 0. Resumen ejecutivo

Versión revisada del diseño de onboarding multi‑tenant con separación clara de dominios: **Auth‑Service** (identidad y tokens), **User‑Service** (perfil), **Tenant‑Service** (gobernanza: tenants, unidades, memberships, junta directiva). Se elimina del alcance de Auth la gestión de delegaciones, transferencias y memberships, trasladándolas a Tenant‑Service. Se mantiene unicidad de administrador, hash‑chaining de gobernanza, importación masiva y cumplimiento normativo con menor acoplamiento.
# 1. Alcance y objetivos

Dominios:
* Auth: OAuth2/OIDC, MFA, sesiones, emisión/rotación de tokens.
* Tenant: creación tenant, alta presidente/admin inicial, delegaciones, transferencias, relaciones owner/renter/family, vigencias, hash‑chain de gobernanza.
* User: perfil global único (multi-correo) y preferencias.

Objetivos:
* Un solo **administrador activo por tenant** (Tenant‑Service) con trazabilidad.
# 2. Requisitos (funcionales y no funcionales)

**Funcionales (clasificados)**

Auth:
1. Registro inicial y flujos forgot/reset password.
2. Emisión de access/refresh tokens con rotación segura.

Tenant:
3. Creación de tenant y asignación de admin/presidente inicial.
4. Gestión gobernanza: transferencia admin, delegación vicepresidente, unicidad roles, TTL delegaciones.
5. Relaciones owner/renter/family por unidad (vigencias, histórico, no hard delete).
6. Importación masiva validada (Excel/CSV) de usuarios + memberships.

User:
7. Gestión de perfil, contactos y consentimientos.

Transversal:
8. Comunicaciones multicanal para invitaciones y consentimientos.
9. Cumplimiento ARCO y trazabilidad auditable.
# Contexto

Clientes → API Gateway → Microservicios. Auth‑Service emite/valida identidad; User‑Service mantiene perfil; Tenant‑Service gestiona condominios, unidades, memberships y gobernanza; Communications notifica; Assembly‑Core consume contexto de Tenant para quórum y roles; Security/Compliance valida identidad oficial.
# Componentes clave

* **Auth‑Service**: /auth, /oauth (futuro), JWKS, MFA, recuperación contraseña, emisión/rotación tokens (sin delegaciones ni memberships).
* **Users‑Service**: perfiles, government_ids, user_contacts (sin unit_memberships).
* **Tenants‑Service**: tenants, units, unit_memberships, governance_positions, tenant_policies (delegaciones, transferencias, unicidad admin, hash chain).
# 0. Resumen ejecutivo

Diseño técnico integral para Auth‑Service y el proceso de onboarding multi‑tenant de SmartEdify. Cubre modelo de identidad global con membresías por condominio y unidad, unicidad de administrador, junta directiva auditable, importación masiva, cumplimiento normativo y seguridad de nivel enterprise.

---

# 1. Alcance y objetivos

* Proveedor de identidad centralizado (OAuth2/OIDC), RBAC/ABAC, MFA, sesiones.
* Onboarding: creación de tenant, alta de presidente temporal, admins, propietarios, arrendatarios y familiares.
* Un solo **administrador activo por tenant** con trazabilidad y hash‑chaining.
* Junta directiva: presidente (delegación), vicepresidente, tesorero, todos auditables.
* Identidad global única con múltiples correos por condominio.

---

# 2. Requisitos (funcionales y no funcionales)

**Funcionales**

1. Registro inicial y flujos forgot/reset password.
2. Importación masiva validada (Excel/CSV) y alta individual.
3. Gestión de roles: admin único, presidente temporal con transferencia, vicepresidente delegable con TTL, tesorero.
4. Relaciones propietario↔arrendatario/familia por unidad, con vigencias y no‑borrado (histórico).
5. Comunicaciones multicanal para invitaciones y consentimientos.
6. Cumplimiento ARCO y trazabilidad auditable.

**No funcionales**

* Seguridad: Argon2id, JWT RS256, JWKS con rotación, DPoP/MTLS opcional.
* Confiabilidad: availability ≥ 99.9% Auth‑Service.
* Performance: P95 login < 300 ms, emisión de token < 200 ms.
* Observabilidad: métricas Prometheus, trazas OpenTelemetry, bitácora inmutable.

---

# 3. Arquitectura (visión C4)

**Contexto**: Clientes → API Gateway → Microservicios. Auth‑Service emite y valida identidad, Users‑Service persiste perfiles y membresías, Tenants‑Service maneja condominios, Communications envía notificaciones, Assembly‑Core gestiona actas y roles con base legal, Security/Compliance valida identidad oficial.

**Componentes clave**

* **Auth‑Service**: endpoints /auth, /oauth, JWKS, MFA, roles y delegaciones, auditoría inmutable.
* **Users‑Service**: perfiles, tenant\_memberships, unit\_memberships, government\_ids, user\_contacts.
* **Tenants‑Service**: datos de condominio y unidades.
* **Communications‑Service**: plantillas, envíos y tracking.
* **Assembly‑Core**: actas, quórum, transferencia de presidencia.
* **Security/Compliance**: verificación documental y políticas antifraude.
* **API‑Gateway**: validación de JWT, extracción de tenant\_id, rate‑limit.

---

# 4. Modelo de datos

(DDL ya definido en versión previa)

---

# 5. API Contracts (OpenAPI extendido)

```yaml
openapi: 3.0.3
info:
  title: Auth-Service API
  version: 1.0.0
servers:
  - url: https://api.smartedify.io
paths:
  /auth/v1/register:
    post:
      summary: Registro de usuario
      requestBody:
        required: true
        content:
          application/json:
            examples:
              valido:
                value: {email: "user@example.com", tenantId: "uuid", role: "propietario", password: "StrongP@ssw0rd"}
              invalido:
                value: {email: "bad", password: "123"}
      responses:
        '201':
          description: Usuario creado
          content:
            application/json:
              example: {userId: "uuid", tenantId: "uuid"}
        '400': {description: Datos inválidos}

  /auth/v1/login:
    post:
      summary: Inicio de sesión
      requestBody:
        content:
          application/json:
            example: {email: "user@example.com", password: "StrongP@ssw0rd"}
      responses:
        '200':
          description: Tokens emitidos
          content:
            application/json:
              example: {access_token: "jwt", refresh_token: "jwt", expires_in: 900}
        '401': {description: Credenciales inválidas}

  /auth/v1/forgot-password:
    post:
      summary: Genera token de recuperación
      requestBody:
        content:
          application/json:
            example: {email: "user@example.com"}
      responses:
        '200': {description: Email enviado}

  /auth/v1/reset-password:
    post:
      summary: Restablecer clave con token
      requestBody:
        content:
          application/json:
            example: {token: "onetime-token", newPassword: "N3wP@ss"}
      responses:
        '200': {description: Clave cambiada}

  /roles/transfer-admin:
    post:
      summary: Transferencia de administrador único
      requestBody:
        content:
          application/json:
            example: {tenantId: "uuid", newAdminId: "uuid"}
      responses:
        '200': {description: Transferencia programada}

  /roles/delegate:
    post:
      summary: Delegación a vicepresidente
      requestBody:
        content:
          application/json:
            example: {tenantId: "uuid", userId: "uuid", role: "vicepresidente", ttl: "P7D", scopes: ["assembly:read"]}
      responses:
        '200': {description: Delegación creada}

  /unit-memberships:
    post:
      summary: Alta arrendatario/familiar
      requestBody:
        content:
          application/json:
            example: {tenantId: "uuid", unitId: "uuid", userEmail: "rent@example.com", relation_type: "renter", valid_from: "2025-09-01", valid_to: "2026-08-31"}
      responses:
        '201': {description: Membership creada}
```

---

# 6. Ejemplos de eventos válidos/ inválidos

**role.changed (válido)**

```json
{"event":"role.changed","id":"uuid","occurred_at":"2025-09-14T12:00:00Z","tenant_id":"uuid","user_id":"uuid","role":"admin","active":true}
```

**role.changed (inválido)**

```json
{"event":"role.changed","user_id":"uuid"}
```

**user.created (válido)**

```json
{"event":"user.created","id":"uuid","occurred_at":"2025-09-14T12:00:00Z","user_id":"uuid","email":"user@example.com"}
```

**unit.renter.added (válido)**

```json
{"event":"unit.renter.added","id":"uuid","occurred_at":"2025-09-14T12:00:00Z","tenant_id":"uuid","unit_id":"uuid","user_id":"uuid","valid_from":"2025-09-01T00:00:00Z","valid_to":"2026-08-31T23:59:59Z"}
```

**unit.renter.added (inválido)**

```json
{"event":"unit.renter.added","id":"uuid","tenant_id":"uuid"}
```

---

# 7. Flujos E2E

(ya documentados con diagramas Mermaid en la versión previa)

---

# 8. Seguridad y cumplimiento

(ya definido en la versión previa; Argon2id, JWKS, MFA, DPoP/MTLS, auditoría, ARCO)

---

# 9. Observabilidad y auditoría

(ya definido en la versión previa)

---

# 10. ADRs

(ya definidos)

---

# 11. Anexos

* Catálogo inicial de scopes.
* JSON Schema de eventos (adjunto).
* Reglas de importación masiva.

---

# 5B. Diseño de API (OpenAPI completo)

```yaml
openapi: 3.0.3
info:
  title: SmartEdify Auth & Identity APIs
  version: 1.0.0
servers:
  - url: https://api.smartedify.io
security:
  - bearerAuth: []
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
  schemas:
    UUID:
      type: string
      format: uuid
    DateTime:
      type: string
      format: date-time
    Email:
      type: string
      format: email
    Role:
      type: string
      enum: [admin, presidente, vicepresidente, tesorero, propietario, arrendatario, familiar]
    UnitRelation:
      type: string
      enum: [owner, renter, family]
    Problem:
      type: object
      required: [type, title, status]
      properties:
        type: {type: string}
        title: {type: string}
        status: {type: integer}
        detail: {type: string}
        instance: {type: string}

paths:
  /auth/v1/register:
    post:
      summary: Alta de usuario por invitación
      tags: [Auth]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [email, tenantId, role]
              properties:
                email: {$ref: '#/components/schemas/Email'}
                tenantId: {$ref: '#/components/schemas/UUID'}
                role: {$ref: '#/components/schemas/Role'}
                metadata:
                  type: object
            examples:
              presidente:
                value: {email: 'p@condo.pe', tenantId: '11111111-1111-1111-1111-111111111111', role: 'presidente'}
      responses:
        '201':
          description: Creado
          content:
            application/json:
              schema:
                type: object
                properties:
                  userId: {$ref: '#/components/schemas/UUID'}
                  invitationId: {$ref: '#/components/schemas/UUID'}
        '400': {description: Datos inválidos, content: {application/problem+json: {schema: {$ref: '#/components/schemas/Problem'}}}}
        '409': {description: Duplicado}

  /auth/v1/forgot-password:
    post:
      summary: Genera token de restablecimiento
      tags: [Auth]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [email]
              properties:
                email: {$ref: '#/components/schemas/Email'}
      responses:
        '202': {description: Enviado}

  /auth/v1/reset-password:
    post:
      summary: Restablece contraseña con token de un solo uso
      tags: [Auth]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [token, newPassword]
              properties:
                token: {type: string, minLength: 32}
                newPassword: {type: string, minLength: 12}
      responses:
        '200': {description: OK}
        '400': {description: Token inválido}
        '410': {description: Token expirado}

  /roles/transfer-admin:
    post:
      summary: Transferencia atómica del rol admin
      tags: [Roles]
      security: [{bearerAuth: []}]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [tenantId, toUserId, validFrom]
              properties:
                tenantId: {$ref: '#/components/schemas/UUID'}
                toUserId: {$ref: '#/components/schemas/UUID'}
                validFrom: {$ref: '#/components/schemas/DateTime'}
                actaId: {$ref: '#/components/schemas/UUID'}
      responses:
        '200':
          description: Transfer programada
          content:
            application/json:
              schema:
                type: object
                properties:
                  transferId: {$ref: '#/components/schemas/UUID'}
        '403': {description: Requiere MFA/permiso}
        '409': {description: Conflicto de admin único}

  /roles/confirm:
    post:
      summary: Aceptación de transferencia/delegación
      tags: [Roles]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [transferId]
              properties:
                transferId: {$ref: '#/components/schemas/UUID'}
      responses:
        '200': {description: Rol activado}
        '404': {description: Transfer no encontrada}

  /roles/delegate:
    post:
      summary: Delegación temporal de funciones (vicepresidente)
      tags: [Roles]
      security: [{bearerAuth: []}]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [tenantId, delegateUserId, scopes, ttl]
              properties:
                tenantId: {$ref: '#/components/schemas/UUID'}
                delegateUserId: {$ref: '#/components/schemas/UUID'}
                scopes: {type: array, items: {type: string}, minItems: 1}
                ttl: {type: string, description: Duración ISO8601}
      responses:
        '200': {description: Delegación creada}
        '400': {description: Escopes o TTL inválidos}

  /unit-memberships:
    post:
      summary: Alta de relación por unidad (owner/renter/family)
      tags: [Units]
      security: [{bearerAuth: []}]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [tenantId, unitId, userId, relationType, validFrom]
              properties:
                tenantId: {$ref: '#/components/schemas/UUID'}
                unitId: {$ref: '#/components/schemas/UUID'}
                userId: {$ref: '#/components/schemas/UUID'}
                relationType: {$ref: '#/components/schemas/UnitRelation'}
                validFrom: {$ref: '#/components/schemas/DateTime'}
                validTo: {$ref: '#/components/schemas/DateTime'}
      responses:
        '201': {description: Relación creada}
        '409': {description: Solapamiento de vigencias}

  /unit-memberships/{id}:
    patch:
      summary: Cierre/actualización de vigencia
      tags: [Units]
      parameters:
        - name: id
          in: path
          required: true
          schema: {$ref: '#/components/schemas/UUID'}
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                validTo: {$ref: '#/components/schemas/DateTime'}
                active: {type: boolean}
      responses:
        '200': {description: Actualizado}
        '400': {description: Regla de negocio violada}
```

---

# 5C. Ejemplos de payloads válidos e inválidos

**/roles/transfer-admin — válido**

```json
{
  "tenantId": "11111111-1111-1111-1111-111111111111",
  "toUserId": "22222222-2222-2222-2222-222222222222",
  "validFrom": "2025-09-14T15:00:00Z",
  "actaId": "33333333-3333-3333-3333-333333333333"
}
```

**Respuesta 200**

```json
{"transferId": "44444444-4444-4444-4444-444444444444"}
```

**/roles/transfer-admin — inválido (dos admins activos)**

```json
{
  "tenantId": "11111111-1111-1111-1111-111111111111",
  "toUserId": "22222222-2222-2222-2222-222222222222",
  "validFrom": "2025-09-14T15:00:00Z"
}
```

**Respuesta 409**

```json
{
  "type": "https://api.smartedify.io/errors/unique-admin",
  "title": "Conflicto de administrador único",
  "status": 409,
  "detail": "Existe un admin activo y la transferencia no está confirmada"
}
```

**/unit-memberships — válido (renter)**

```json
{
  "tenantId": "11111111-1111-1111-1111-111111111111",
  "unitId": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  "userId": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
  "relationType": "renter",
  "validFrom": "2025-10-01T00:00:00Z",
  "validTo": "2026-09-30T23:59:59Z"
}
```

**/unit-memberships — inválido (vigencias solapadas)**

```json
{
  "tenantId": "11111111-1111-1111-1111-111111111111",
  "unitId": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  "userId": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
  "relationType": "renter",
  "validFrom": "2025-06-01T00:00:00Z",
  "validTo": "2025-12-31T23:59:59Z"
}
```

**Respuesta 409**

```json
{
  "type": "https://api.smartedify.io/errors/overlap",
  "title": "Solapamiento de vigencias",
  "status": 409,
  "detail": "Existe una relación renter activa para la unidad en el rango"
}
```

**Eventos — válidos/ inválidos**

role.delegated — válido

```json
{
  "event": "role.delegated",
  "id": "77777777-7777-7777-7777-777777777777",
  "occurred_at": "2025-09-14T12:00:00Z",
  "tenant_id": "11111111-1111-1111-1111-111111111111",
  "granter_id": "99999999-9999-9999-9999-999999999999",
  "delegate_id": "88888888-8888-8888-8888-888888888888",
  "role": "vicepresidente",
  "scopes": ["admin:read","assembly:manage:temp"],
  "ttl": "P14D",
  "consent_hash": "BASE64=="
}
```

role.delegated — inválido (TTL vacío)

```json
{
  "event": "role.delegated",
  "id": "77777777-7777-7777-7777-777777777777",
  "occurred_at": "2025-09-14T12:00:00Z",
  "tenant_id": "11111111-1111-1111-1111-111111111111",
  "granter_id": "99999999-9999-9999-9999-999999999999",
  "delegate_id": "88888888-8888-8888-8888-888888888888",
  "role": "vicepresidente",
  "scopes": [],
  "ttl": ""
}
```

Rechazo del Schema

```json
{"error": "scopes must contain at least one item; ttl must be a non-empty ISO8601 duration"}
```

Especificaciones UI/UX para el flujo desde la landpage hacia la aplicación con login:

### 1. Landpage

* **Header fijo**: logo SmartEdify, menú simple (features, precios, contacto).
* **Hero section**: mensaje de valor, botón primario **“Iniciar sesión”** (CTA).
* **Footer**: enlaces legales (términos, política de privacidad).

### 2. Flujo de acceso

1. **Click en “Iniciar sesión”** → redirección a `/auth/login` (controlado por API Gateway).

2. **Pantalla Login**:

   * Inputs: correo / usuario (DNI, RUC, CE, Pasaporte según definición), contraseña.
   * Botón primario: **Acceder**.
   * Links secundarios: “¿Olvidaste tu contraseña?” → `/auth/forgot-password`.
   * Acceso MFA cuando corresponda (campo dinámico para TOTP o WebAuthn).

3. **Forgot password**:

   * Input: correo o documento.
   * Mensaje: “Si la cuenta existe, recibirás un enlace para restablecer tu contraseña”.
   * Enlace con token de un solo uso, validado en Auth Service.

4. **Reset password**:

   * Inputs: nueva contraseña, confirmación.
   * Validación Argon2id y políticas de seguridad.
   * Mensaje de éxito + redirección a login.

### 3. Onboarding inicial (rol presidente temporal)

* Tras el primer login:

  * **Wizard paso a paso**:

    1. Confirmar datos personales.
    2. Actualizar datos del condominio (integración con Tenants Service).
    3. Crear administradores o importar usuarios vía Excel (Users Service).
    4. Confirmación final y envío de notificaciones a través de Communications Service.

### 4. Consistencia visual

* **Diseño responsivo** (mobile-first).
* **Sistema de diseño**: tipografía clara, colores institucionales, botones primarios contrastados.
* **Mensajería**: mensajes de error cortos, siempre neutrales.

### 5. Accesibilidad

* Contraste mínimo AA.
* Navegación por teclado completa.
* Etiquetas ARIA para inputs de login y recuperación.
