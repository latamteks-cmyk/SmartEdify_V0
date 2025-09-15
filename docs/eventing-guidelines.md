# Guía de eventos (NATS)

## Convenciones
- Subject: `v1.<dominio>.<evento>`
- `data`: objeto con `id`, `occurred_at`, `actor`, `tenant_id` y payload.
- `event_id` UUID para idempotencia.

## DLQ
- Cola por servicio `dlq.<service>`; *retry* exponencial con *jitter*. Runbook asociado.
