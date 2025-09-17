# Topología RabbitMQ y Dead Letter Queue

Este documento describe la configuración base de RabbitMQ empleada por los servicios de backend para publicar eventos a través de la outbox y gestionar mensajes en la cola *dead-letter* (DLQ). Se detalla el flujo de mensajes, las políticas de reintento y las responsabilidades operativas asociadas.

## Topología

| Recurso | Nombre por defecto | Descripción |
|---------|--------------------|-------------|
| Exchange principal | `tenant.events` (`RABBITMQ_EXCHANGE`) | Exchange de tipo `topic` que recibe los eventos publicados por la outbox. |
| Cola principal | `tenant-events` (`RABBITMQ_QUEUE`) | Cola duradera a la que se enrutan los mensajes salientes. |
| Exchange DLX | `dlx` (`RABBITMQ_DLX`) | Exchange dedicado a los mensajes que no pudieron procesarse exitosamente. |
| Cola dead-letter | `dead-letter` (`RABBITMQ_DEAD_LETTER_QUEUE`) | Cola duradera que almacena los mensajes fallidos. |

La cola principal se declara con los argumentos `x-dead-letter-exchange` y, opcionalmente, `x-dead-letter-routing-key`. Esto garantiza que cualquier `nack`, expiración o error de procesamiento moverá el mensaje al exchange `dlx`, que a su vez lo enruta a la cola `dead-letter`.

## Flujo de mensajes

1. El *Outbox Poller* serializa el evento y lo envía al `RabbitMqPublisher`.
2. El publisher garantiza la topología anterior (exchanges + colas) y publica en `tenant.events` con `routingKey` configurable (`RABBITMQ_ROUTING_KEY`).
3. Los consumidores principales (futuros workers) extraen mensajes de `tenant-events` y confirman con `ack` cuando el procesamiento es exitoso.
4. Ante un `nack` o al superar los reintentos configurados en la capa de dominio, el mensaje se redirige automáticamente al exchange `dlx` y termina en la cola `dead-letter`.

## Políticas de reintento

- La capa de outbox realiza reintentos en memoria antes de publicar, con *backoff* exponencial (`CONSUMER_RETRY_BASE_DELAY_MS`, `CONSUMER_RETRY_MAX_DELAY_MS`).
- El publisher marca cada mensaje como persistente para permitir reentregas posteriores en RabbitMQ.
- Los consumidores deben aplicar reintentos idempotentes y emitir `nack` sólo cuando el error sea permanente. Los errores transitorios se reintentan según la estrategia interna del consumidor.
- El `RabbitMqDeadLetterConsumer` no reenvía automáticamente los mensajes, pero genera visibilidad operativa sobre la cola DLQ.

## Monitorización y alertas

- Métrica `broker_dead_letter_messages`: gauge Prometheus que refleja el número de mensajes en la cola `dead-letter`. Se actualiza periódicamente (intervalo `RABBITMQ_DLQ_CHECK_INTERVAL_MS`).
- Logs: cada vez que el monitor detecta nuevos mensajes en la DLQ se emite un `warn` con el tamaño de la cola.
- Alertas sugeridas: disparar un aviso si la métrica supera `RABBITMQ_DLQ_ALERT_THRESHOLD` durante más de 5 minutos o si la cola crece de forma sostenida.

## Operaciones de reintento manual

1. Revisar métricas y logs para identificar la causa raíz del fallo.
2. Inspeccionar los mensajes con `rabbitmqadmin get queue=dead-letter count=10` (no olvidar confirmar/descartar tras la revisión).
3. Una vez corregido el problema, reenviar los mensajes usando `rabbitmqadmin publish exchange=tenant.events routing_key=<routing> payload="..."` o scripts específicos.
4. Documentar el incidente y la resolución en el runbook correspondiente.

## Variables de configuración relevantes

| Variable | Descripción |
|----------|-------------|
| `TENANT_PUBLISHER=rabbitmq` | Activa el publisher RabbitMQ. |
| `TENANT_CONSUMER=rabbitmq` | Habilita el monitor de DLQ para RabbitMQ. |
| `RABBITMQ_URL` | Cadena de conexión AMQP (incluye credenciales/host/puerto). |
| `RABBITMQ_EXCHANGE`, `RABBITMQ_ROUTING_KEY`, `RABBITMQ_QUEUE` | Configuración de la cola principal. |
| `RABBITMQ_DLX`, `RABBITMQ_DEAD_LETTER_QUEUE`, `RABBITMQ_DEAD_LETTER_ROUTING_KEY` | Topología de la cola dead-letter. |
| `RABBITMQ_DLQ_CHECK_INTERVAL_MS` | Frecuencia de muestreo de la cola dead-letter. |
| `RABBITMQ_DLQ_ALERT_THRESHOLD` | Número de mensajes a partir del cual se emite alerta en logs/métricas. |

> Nota: para ambientes donde RabbitMQ no está disponible, el monitor/publisher registrarán el error y permanecerán en modo inactivo. Instalar `amqplib` es requisito para habilitar la funcionalidad completa.
