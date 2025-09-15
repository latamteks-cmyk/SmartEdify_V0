# Plan — assembly-service

## Objetivo PMV
Gestionar convocatorias, acreditación, votación y actas mínimas.

## Alcance inicial (fast-track)
- Convocatoria básica con título, fecha y tenant.
- Registro de asistentes (acreditación mínima).
- Votación binaria en un único ítem.
- Generación de acta como documento PDF stub.

## Endpoints (evolutivos)
- `POST /assemblies` → crear convocatoria.
- `POST /assemblies/{id}/attendees` → registrar asistente.
- `POST /assemblies/{id}/votes` → emitir voto.
- `GET /assemblies/{id}/minutes` → obtener acta.

## Eventos dominio
- `assembly.created`
- `assembly.attendee.registered`
- `assembly.vote.cast`
- `assembly.minutes.generated`

## Dependencias mínimas
- Auth (OIDC básico).
- Tenant.
- Document Service (para acta).
- Communication (convocatoria enviada).
- Compliance-lite.

## Fast-track backlog
- [ ] Scaffold servicio con `/health`.
- [ ] Modelo Assembly con estado inicial.
- [ ] Endpoint create convocatoria.
- [ ] Registro de asistentes.
- [ ] Voto binario.
- [ ] Generar acta stub.
- [ ] Publicar eventos básicos.
