# Plan de integración — User Portal (Squarespace)

## Contexto
El User Portal se despliega en `https://www.smart-edify.com` (Squarespace). No soporta backend propio. La integración debe hacerse vía APIs expuestas desde los microservicios.

## Estrategia
- **API Gateway/BFF**: crear `gateway-service` que exponga `/api/*` hacia frontend. Agrupa Assembly, Reservation, Maintenance.
- **Dominio**: configurar subdominio `api.smart-edify.com` apuntando al gateway.
- **Seguridad**: Auth-service con OIDC + PKCE, `client_id` exclusivo para Squarespace, redirect URIs al dominio público.
- **CORS**: habilitar origen `https://www.smart-edify.com`.
- **Widgets JS**: SDK ligero en JS para consumo de endpoints, embebible en Squarespace.

## Endpoints expuestos vía gateway
- `/api/auth/*` → login, refresh.
- `/api/assemblies/*` → convocatorias, acreditación, votos.
- `/api/reservations/*` → reservas, confirmaciones, cancelaciones.
- `/api/maintenance/*` → incidencias y órdenes de trabajo.

## Flujos principales
1. **Login**
   - Squarespace redirige a Auth-service.
   - Usuario se autentica, Auth devuelve tokens a `https://www.smart-edify.com/callback`.
   - Tokens guardados en `localStorage` con expiración.

2. **Assembly**
   - Usuario logueado consume `/api/assemblies/{id}` para acreditarse y votar.
   - Acta accesible vía enlace seguro.

3. **Reservation**
   - Usuario selecciona área/slot.
   - `POST /api/reservations` → pre-reserva.
   - Pago con adapter → confirmación.

4. **Maintenance**
   - Usuario crea incidencia con descripción.
   - `POST /api/incidents`.
   - Seguimiento vía `/api/workorders/{id}`.

## Backlog fast-track
- [ ] Scaffold `gateway-service` con `/health`.
- [ ] Configurar CORS y dominio api.smart-edify.com.
- [ ] Registrar `client_id` Squarespace en Auth.
- [ ] Implementar endpoints proxy `/api/assemblies/*`, `/api/reservations/*`, `/api/maintenance/*`.
- [ ] Generar SDK JS (npm + CDN).
- [ ] Documentar integración en `docs/documento-rector.md`.
- [ ] Demo de login + Assembly mínima en Squarespace.

## Riesgos
- Limitaciones de Squarespace en JS avanzado → validar compatibilidad.
- Seguridad de tokens en navegador → usar PKCE + expiraciones cortas.
- Latencia entre Squarespace y microservicios → CDN/caching en gateway.
