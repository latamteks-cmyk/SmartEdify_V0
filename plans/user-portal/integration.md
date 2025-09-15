# Plan de integración — User Portal (Squarespace)

## Contexto
- El User Portal se renderiza en Squarespace bajo `https://www.smart-edify.com` (y variante apex).
- Squarespace no permite backend propio; toda funcionalidad dinámica debe consumirse vía APIs externas.
- Los microservicios existentes (Assembly, Reservation, Maintenance, Auth, etc.) se expondrán a través de un Gateway/BFF.

## Arquitectura objetivo
- **Browser (Squarespace)** → `api.smart-edify.com` (Gateway/BFF) → microservicios (`assembly-service`, `reservation-service`, `maintenance-service`, `auth-service`, ...).
- **Gateway/BFF** (`gateway-service`) agrupa y normaliza endpoints `/api/*`, aplica políticas de seguridad y caching.
- **Auth-service** utiliza OIDC Authorization Code + PKCE con un `client_id` exclusivo para Squarespace.
- **Widgets/SDK JS**: biblioteca ligera embebible (npm + CDN) que encapsula autenticación, consumo de APIs y helpers UI.

## DNS y TLS
- `www.smart-edify.com` y `smart-edify.com` → hosting de Squarespace.
- `api.smart-edify.com` → Gateway/BFF (ALB/CDN) con certificados gestionados.
- Certificados TLS independientes para Squarespace y Gateway; HSTS activo en ambos dominios.

## CORS
- Orígenes permitidos: `https://www.smart-edify.com`, `https://smart-edify.com`.
- Métodos: `GET`, `POST`, `PUT`, `DELETE`, `OPTIONS`.
- Cabeceras permitidas: estándar (`Content-Type`, `Accept`, etc.) + `Authorization`, `Traceparent`.
- Credenciales deshabilitadas; tokens siempre en encabezados Bearer.

## Autenticación y seguridad
1. El SDK genera `code_verifier` y `code_challenge` (PKCE) en el navegador.
2. El usuario es redirigido a `AUTH/authorize` con `client_id=squarespace`, `redirect_uri=https://www.smart-edify.com/auth/callback` y `response_type=code`.
3. La página `/auth/callback` ejecuta el SDK para canjear el `code` por tokens en `AUTH/token` vía CORS.
4. Tokens de acceso/refresh se conservan solo en memoria (no `localStorage`). Refresh tokens con rotación y revocación.
5. Todas las peticiones al Gateway incluyen `Authorization: Bearer <token>`; el Gateway valida firma/expiración y propaga `traceparent`.
6. CSP estricta en Squarespace; gateway fuerza HTTPS y sanea headers sensibles.

## SDK JS — extracto de referencia
```html
<script>
const AUTH = {
  issuer: "https://auth.smartedify.local",
  client_id: "squarespace",
  redirect_uri: "https://www.smart-edify.com/auth/callback",
  scopes: "openid profile email offline_access"
};
let accessToken = null;
let refreshToken = null;

async function pkce() {
  const random = crypto.getRandomValues(new Uint8Array(32));
  const codeVerifier = btoa(String.fromCharCode(...random))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(codeVerifier));
  const codeChallenge = btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  sessionStorage.setItem("cv", codeVerifier);
  return codeChallenge;
}

function login() {
  pkce().then((codeChallenge) => {
    const url = new URL(AUTH.issuer + "/authorize");
    url.searchParams.set("client_id", AUTH.client_id);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("redirect_uri", AUTH.redirect_uri);
    url.searchParams.set("scope", AUTH.scopes);
    url.searchParams.set("code_challenge", codeChallenge);
    url.searchParams.set("code_challenge_method", "S256");
    location.href = url.toString();
  });
}

async function handleCallback() {
  const params = new URLSearchParams(location.search);
  const code = params.get("code");
  if (!code) return;
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: AUTH.redirect_uri,
    code_verifier: sessionStorage.getItem("cv")
  });
  const response = await fetch(AUTH.issuer + "/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });
  const tokens = await response.json();
  accessToken = tokens.access_token;
  refreshToken = tokens.refresh_token;
}

async function api(path, init = {}) {
  const headers = { ...(init.headers || {}), Authorization: `Bearer ${accessToken}` };
  return fetch("https://api.smart-edify.com" + path, { ...init, headers }).then((r) => r.json());
}
</script>
```

## Endpoints expuestos vía Gateway
- `/api/auth/*` → login, refresh.
- `/api/assemblies/*` → convocatorias, acreditación, votos, descarga de actas.
- `/api/reservations/*` → reservas, confirmaciones, cancelaciones.
- `/api/maintenance/*` → incidencias y órdenes de trabajo.

## Flujos funcionales clave
1. **Login / Gestión de sesión**
   - Botón en `/login` invoca `login()` del SDK.
   - Callback en `/auth/callback` ejecuta `handleCallback()` y deja tokens listos en memoria.
   - El SDK ofrece `refresh()` automático y gestión de expiraciones.

2. **Assembly**
   - Usuario autenticado consulta `/api/assemblies/{id}` vía SDK.
   - Se acreditan votos y se accede a actas mediante enlaces firmados.

3. **Reservation**
   - Selección de área y slot desde Squarespace.
   - `POST /api/reservations` crea pre-reserva y devuelve intent de pago.
   - Integración con adaptador de pagos del Gateway finaliza confirmación.

4. **Maintenance**
   - Usuario registra incidencia con `POST /api/incidents`.
   - Seguimiento a través de `/api/workorders/{id}` con actualizaciones en tiempo real (long polling / SSE si aplica).

## Observabilidad
- Gateway propaga y registra `traceparent` para correlación extremo a extremo.
- Dashboards de conversión de login, errores 4xx/5xx por ruta y latencia entre Squarespace y microservicios.

## Backlog fast-track

- [ ] Scaffold `gateway-service` con `/health` y despliegue inicial.
- [ ] Configurar DNS (`api.smart-edify.com`) y certificados TLS.
- [ ] Activar política CORS según matriz anterior.
- [ ] Registrar `client_id` Squarespace en Auth-service y configurar PKCE.
- [ ] Implementar proxies `/api/assemblies/*`, `/api/reservations/*`, `/api/maintenance/*`.
- [ ] Generar SDK JS (bundler + publicación npm/CDN) y minificar snippet.
- [ ] Crear páginas `/login` y `/auth/callback` en Squarespace con el SDK.
- [ ] Documentar la integración end-to-end en `docs/documento-rector.md`.
- [ ] Configurar dashboards y alertas de observabilidad.
- [ ] Demo de login + flujo Assembly en Squarespace.


## Riesgos
- Limitaciones de Squarespace para scripts avanzados → validar compatibilidad y CSP.
- Seguridad de tokens en navegador → uso estricto de PKCE, expiraciones cortas y rotación.
- Latencia adicional entre Squarespace y microservicios → mitigar con CDN/caching en el Gateway.
- Dependencia de CORS correcto; fallos bloquean toda integración → automatizar pruebas de smoke.
