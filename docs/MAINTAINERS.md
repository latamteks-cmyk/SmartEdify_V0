# Guía de mantenimiento de documentación

## Buenas prácticas
- Mantén la estructura y los nombres de archivos según el índice en `docs/README.md`.
- Usa títulos y secciones consistentes; sigue el formato de los documentos consolidados.
- Prefiere enlaces relativos y revisa que los links internos funcionen tras cada cambio.
- Actualiza referencias cruzadas y avisos de redirección si mueves o renombras archivos.
- Usa el archivo `.markdownlint.json` para validar formato antes de hacer push.

## Validación y CI
- Todos los PRs deben pasar el workflow de linting (`docs-lint.yml`).
- Verifica que no existan advertencias ni errores de markdown antes de mergear.
- Si agregas nuevos documentos, enlázalos en el índice principal (`docs/README.md`).

## Estructura recomendada
- Un solo archivo por tema principal (arquitectura, API, testing, seguridad, status, etc.).
- Subcarpetas solo para runbooks, observabilidad, operaciones y seguridad avanzada.
- Usa avisos de redirección en archivos obsoletos o movidos.

## Contacto
Para dudas o sugerencias, contacta al equipo de documentación o abre un issue en el repositorio.
