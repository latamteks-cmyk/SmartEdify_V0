# Política de Seguridad

## Reporte de vulnerabilidades
Si identificas una vulnerabilidad o riesgo de seguridad, contacta a [security@smartedify.io](mailto:security@smartedify.io) o utiliza el formulario privado en https://smartedify.io/security-report. Proporciona contexto detallado (servicio, pasos, impacto) y evita canales públicos para información sensible.

## Alcance
Esta política cubre:
- Servicios y microservicios bajo `apps/` (auth-service, tenant-service, user-service, etc.)
- Infraestructura y automatizaciones en `api/`, `scripts/`, `docker-compose.yml` y configuraciones relacionadas.
- Documentación operativa y de arquitectura que pueda exponer secretos o vectores de ataque.

Quedan fuera de alcance los entornos de producción de clientes y cualquier integración externa no gestionada por SmartEdify.

## Proceso de divulgación y tiempos de respuesta
- **Confirmación inicial**: respuesta en 2 días hábiles.
- **Análisis y mitigación**: evaluación en 5 días hábiles, coordinación de plan de corrección si aplica.
- **Corrección y publicación**: parche o mitigación en máximo 30 días tras validación, priorizando problemas críticos.

Se practica divulgación responsable y se acuerda la fecha de publicación con el reportante. Si se requiere ajustar la ventana de divulgación (por explotación activa, etc.), indícalo en el reporte inicial.

---
> Esta política reemplaza y consolida la información previa de SECURITY.md. Las referencias deben actualizarse a este archivo.