# Política de Seguridad

## Reportar vulnerabilidades
Si identificas una vulnerabilidad o riesgo de seguridad, envía un correo electrónico a [security@smartedify.io](mailto:security@smartedify.io) o completa el formulario privado en https://smartedify.io/security-report. Proporciona la mayor cantidad de contexto posible (servicio afectado, pasos de reproducción, impacto esperado) para acelerar la investigación. No compartas información sensible en canales públicos.

## Alcance
Esta política cubre todos los componentes alojados en este repositorio, incluidos:

- Servicios y microservicios bajo `apps/` (auth-service, tenant-service, user-service y futuros módulos).
- Infraestructura y automatizaciones provistas en `api/`, `scripts/`, `docker-compose.yml` y archivos de configuración relacionados.
- Documentación operativa y de arquitectura que pueda exponer secretos o vectores de ataque.

Quedan fuera de alcance los entornos de producción de clientes y cualquier integración externa no mantenida por el equipo de SmartEdify.

## Tiempos de respuesta y proceso de divulgación
- **Confirmación inicial**: responderemos dentro de los 2 días hábiles siguientes para confirmar la recepción y solicitar información adicional si es necesario.
- **Análisis y mitigación**: el equipo de seguridad realizará la evaluación de impacto en un plazo de 5 días hábiles. Si la vulnerabilidad es validada, coordinaremos un plan de corrección y mitigación.
- **Corrección y publicación**: nos esforzamos por publicar parches o mitigaciones definitivas dentro de los 30 días siguientes a la validación, priorizando los problemas críticos.

Practicamos divulgación responsable. Te informaremos cuando la corrección esté lista y acordaremos una fecha de publicación coordinada antes de compartir detalles públicamente. Si crees que la ventana de divulgación debe ajustarse (por ejemplo, debido a explotación activa), comunícalo en tu reporte inicial.
