# Plan — gateway-service (BFF para Squarespace)

## Objetivo
Exponer un único edge `/api/*` para el User Portal en smart-edify.com (Squarespace). Unificar Auth, Assembly, Reservation y Maintenance. Aplicar CORS, rate-limit, caching y observabilidad.

## Alcance PMV
- Proxy y orquestación HTTP → microservicios.
- OIDC PKCE con Auth-service. Gestión de sesión en browser (tokens en memoria).
- CORS: `https://www.smart-edify.com` y `https://smart-edify.com`.
- Rate limit por IP+tenant. 100 rpm por defecto.
- Logs estructurados + trazas OTel.

## Rutas
- `/api/auth/*` → auth-service
- `/api/assemblies/*` → assembly-service
- `/api/reservations/*` → reservation-service
- `/api/maintenance/*` → maintenance-service

## Seguridad
- Validación de `aud`, `iss`, `kid`. JWKS cacheable 5 min.
- Anti-CSRF: tokens en memoria + `SameSite=Lax` si se usa cookie de *state*.
- Throttling sensible por endpoint.

## Error model
```json
{ "error": { "code": "string", "message": "string", "trace_id": "uuid" } }
```

## Observabilidad
- APM: latencia p95 por ruta, tasa de error, *upstream time*.
- *Feature flags* para *circuit breakers* y *canary*.

## Despliegue
- Contenedor `gateway-service` detrás de CDN/ALB. TLS en edge. HSTS activo.
- DNS: `api.smart-edify.com` → gateway. Squarespace consume `https://api.smart-edify.com`.

## Backlog fast-track

### Plataforma
- [ ] Scaffold (NestJS/Koa/Kong). `/health`.
- [ ] CORS + OIDC middleware.
- [ ] Proxy tables y timeouts.
- [ ] Rate limiting y *request-id*.
- [ ] OTel exporter y dashboards.

### Integración Squarespace ↔ Gateway
- [ ] DNS y certificados para `api.smart-edify.com`.
- [ ] Deploy inicial gateway con `/health` y `/api/auth/*`.
- [ ] PKCE end-to-end y callback en Squarespace.
- [ ] Proxies a Assembly, Reservation y Maintenance.
- [ ] Observabilidad y dashboards.
- [ ] Canary y *roll-back*.
