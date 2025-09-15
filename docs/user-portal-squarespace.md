# Integración User Portal — Squarespace

## Premisas
- Frontend alojado en Squarespace en `smart-edify.com`.
- Sin backend propio en Squarespace. Uso de APIs externas.

## Arquitectura
- Browser → `api.smart-edify.com` (gateway/BFF) → microservicios.
- Auth-service con OIDC Authorization Code + PKCE.

## DNS y TLS
- `www.smart-edify.com` → Squarespace.
- `api.smart-edify.com` → Gateway (ALB/CDN). Certificados en ambos.

## CORS
- Orígenes permitidos: `https://www.smart-edify.com`, `https://smart-edify.com`.
- Métodos: GET, POST, PUT, DELETE, OPTIONS. Headers estándar + `Authorization`.

## Flujo de autenticación (PKCE)
1. App JS genera `code_verifier` y `code_challenge`.
2. Redirige a `AUTH/authorize` con `client_id=squarespace`, `redirect_uri=https://www.smart-edify.com/auth/callback`, `response_type=code`, `code_challenge`, `code_challenge_method=S256`.
3. Callback en Squarespace (página) ejecuta *script* que intercambia `code`→`token` contra `AUTH/token` vía CORS.
4. Tokens en memoria. *Refresh* con rotación segura.

## Snippet SDK (mínimo)
```html
<script>
const AUTH={
  issuer:"https://auth.smartedify.local", client_id:"squarespace",
  redirect_uri:"https://www.smart-edify.com/auth/callback",
  scopes:"openid profile email offline_access"
};
let accessToken=null, refreshToken=null;

async function pkce(){
  const v=crypto.getRandomValues(new Uint8Array(32));
  const codeVerifier=btoa(String.fromCharCode(...v)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  const hash=await crypto.subtle.digest('SHA-256', new TextEncoder().encode(codeVerifier));
  const codeChallenge=btoa(String.fromCharCode(...new Uint8Array(hash))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  sessionStorage.setItem('cv',codeVerifier); return codeChallenge;
}
function login(){
  pkce().then(cc=>{
    const u=new URL(AUTH.issuer+"/authorize");
    u.searchParams.set('client_id',AUTH.client_id);
    u.searchParams.set('response_type','code');
    u.searchParams.set('redirect_uri',AUTH.redirect_uri);
    u.searchParams.set('scope',AUTH.scopes);
    u.searchParams.set('code_challenge',cc);
    u.searchParams.set('code_challenge_method','S256');
    location.href=u.toString();
  });
}
async function handleCallback(){
  const p=new URLSearchParams(location.search); const code=p.get('code');
  if(!code) return;
  const body=new URLSearchParams({
    grant_type:'authorization_code', code,
    redirect_uri:AUTH.redirect_uri,
    code_verifier:sessionStorage.getItem('cv')
  });
  const r=await fetch(AUTH.issuer+'/token',{method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body});
  const t=await r.json(); accessToken=t.access_token; refreshToken=t.refresh_token;
}
async function api(path,init={}){
  return fetch('https://api.smart-edify.com'+path,{...init, headers:{...(init.headers||{}), Authorization:`Bearer ${accessToken}`}}).then(r=>r.json());
}
</script>
```

## Páginas en Squarespace
- `/login` botón que llama `login()`.
- `/auth/callback` con script `handleCallback()`.
- Vistas consumen `api('/api/assemblies/...')`, etc.

## Seguridad
- Tokens solo en memoria. Nada en *localStorage*.
- CSP estricta. HSTS en dominio.
- Revocación y rotación habilitadas en Auth.

## Observabilidad
- En gateway, propagar `traceparent` en respuestas para correlación.
- Medir tasa de conversión login y errores 4xx/5xx por ruta.

## Backlog
- [ ] Alta de `client_id` Squarespace en Auth.
- [ ] Activar CORS en gateway.
- [ ] Páginas `/login` y `/auth/callback` en Squarespace.
- [ ] SDK minificado y versiónado.
- [ ] Dashboards de conversión y errores.
