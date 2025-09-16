# Guía OpenAPI

## Estilo y organización
- Un archivo por servicio siguiendo la convención `openapi/<servicio>/openapi.yaml`; expone rutas bajo `/v1`.
- Recursos en plural y en minúscula (`/students`, `/students/{student_id}`) con respuestas JSON en camelCase.
- `operationId` único por operación (`<Recurso><Accion>`), reutilizado en pruebas de contrato y SDKs.
- Documentar todos los códigos de estado esperados y mensajes de error con `content.application/json`.
- Usar `components/parameters` para filtros comunes y `components/responses` para paginación, errores y `401/403`.

## Metadatos obligatorios
- `info`: `title`, `version`, `description`, `contact.email`, `license` y `termsOfService`.
- `servers`: al menos `production` y `staging` con variables `{tenant}` si aplica multi-tenant.
- `tags`: describen dominios funcionales y tienen `description` para la documentación.
- Incluir `externalDocs` apuntando a la wiki del servicio si existe.

## Componentes y reutilización
- `components/schemas` compartidos dentro del servicio; no se repiten definiciones entre endpoints.
- Para enumeraciones reutilizables, definir `x-enum-varnames` y ejemplos con `x-examples`.
- Los cambios compatibles incrementan `info.version` menor (`1.2.0` → `1.3.0`); cambios incompatibles incrementan versión mayor.

## Pruebas y control de calidad
- Validar el spec con `npm run lint:openapi` (Spectral) en CI y antes de hacer merge.
- Ejecutar contract tests que verifiquen `operationId` y respuestas con JSON Schema derivado de `components/schemas`.
- Generar documentación previa al merge con Redocly CLI (`npx @redocly/cli build-docs`) y adjuntar el HTML en la PR.
- Revisar breaking changes usando `npx openapi-diff <base> <head>` cuando se actualicen versiones.

## Herramientas recomendadas
- [Spectral](https://github.com/stoplightio/spectral) para linting y reglas personalizadas.
- [Redoc](https://github.com/Redocly/redoc) para visualización y previsualización de los specs.
- [OpenAPI Generator](https://openapi-generator.tech) para generar SDKs y asegurar que los `schemas` sean consumibles.
