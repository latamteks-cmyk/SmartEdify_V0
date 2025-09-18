## Estado (2025-09-17)
- Pendiente kickoff. Depende de `tenant-context` para autorización y roles.

## Próximos pasos
1. Definir modelo de dominio inicial y endpoints CRUD.
2. Diseñar esquema de eventos y consumidores necesarios.
3. Incorporar contract tests desde OpenAPI en el arranque.
# Plan — reservation-service

## Objetivo PMV
Gestionar reservas de áreas comunes con confirmación vía pago.

## Alcance inicial (fast-track)
- Catálogo de áreas con nombre y tarifa.
- Creación de reserva provisional con expiración (pre-hold).
- Confirmación de reserva con pago simulado.
- Cancelación manual.

## Endpoints (evolutivos)
- `POST /reservations` → crear pre-reserva.
- `POST /reservations/{id}/confirm` → confirmar (requiere pago).
- `POST /reservations/{id}/cancel` → cancelar.
- `GET /reservations/{id}` → detalle.

## Eventos dominio
- `reservation.created`
- `reservation.confirmed`
- `reservation.cancelled`

## Dependencias mínimas
- Auth.
- Tenant.
- Finance-lite.
- Payments-adapter (stub).
- Communication.

## Fast-track backlog
- [ ] Scaffold servicio con `/health`.
- [ ] Modelo Area y Reservation.
- [ ] Endpoint create reserva provisional.
- [ ] Expiración automática de pre-hold.
- [ ] Confirmación con pago simulado.
- [ ] Cancelación.
- [ ] Publicar eventos básicos.
