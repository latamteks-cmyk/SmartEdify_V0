# Plan — maintenance-service

## Objetivo PMV
Gestionar activos, incidencias y órdenes de trabajo mínimas.

## Alcance inicial (fast-track)
- Registro de activo con jerarquía simple.
- Creación de incidencia con descripción y prioridad.
- Orden de trabajo asociada a incidencia.
- Cierre de orden de trabajo con costo estimado.

## Endpoints (evolutivos)
- `POST /assets` → crear activo.
- `POST /incidents` → crear incidencia.
- `POST /workorders` → crear OT.
- `POST /workorders/{id}/close` → cerrar OT.
- `GET /workorders/{id}` → detalle.

## Eventos dominio
- `asset.created`
- `incident.opened`
- `workorder.created`
- `workorder.closed`

## Dependencias mínimas
- Auth.
- Tenant.
- Document Service (evidencias).
- Finance-lite (costeo).
- Communication (avisos).

## Fast-track backlog
- [ ] Scaffold servicio con `/health`.
- [ ] Modelo Asset, Incident, WorkOrder.
- [ ] Endpoint crear activo.
- [ ] Endpoint crear incidencia.
- [ ] Endpoint crear OT.
- [ ] Endpoint cierre de OT.
- [ ] Publicar eventos básicos.
