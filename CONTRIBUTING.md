# Guía de Contribución

Gracias por colaborar con SmartEdify. Esta guía resume el flujo esperado para enviar cambios y detalla el proceso específico para trabajar con los diagramas Mermaid del repositorio.

## Flujo general
1. Registra el trabajo en un issue o enlaza una entrada existente en `docs/tareas.md`.
2. Ejecuta los linters y pruebas relevantes (`npm run lint`, `npm test`, comandos específicos por servicio) antes de abrir la PR.
3. Actualiza la documentación relacionada (README, `docs/status.md`, `docs/spec.md`, runbooks) cuando una modificación afecte contratos, métricas o procesos operativos.
4. Consulta `docs/README.md` para validar que el índice operativo sigue siendo coherente con tus cambios.

## Diagramas Mermaid
Sigue estos pasos siempre que crees o edites archivos en `docs/design/diagrams/`:

1. Añade el bloque front matter obligatorio descrito en `docs/design/diagrams/README.md` con los campos `id`, `title`, `description`, `updated` y `tags`.
2. Usa etiquetas HTML `<br/>` para notas o labels multilínea y evita fences ```mermaid``` en los `.mmd` (sólo debe existir la sintaxis Mermaid).
3. Ejecuta `npm run lint:mermaid` para validar metadatos y confirmar que ningún archivo contiene fences o campos faltantes.
4. Si el diagrama se referencia en otros documentos (por ejemplo, `README.md` o `docs/status.md`), actualízalos en la misma PR para mantener la trazabilidad.
5. Adjunta capturas/renderizados únicamente si aportan contexto adicional; el repositorio prioriza los `.mmd` versionados y validados.

Cumplir estos pasos garantiza que las automatizaciones (`scripts/lint-mermaid.mjs` y la verificación en CI) mantengan consistencia entre la documentación y los diagramas.
