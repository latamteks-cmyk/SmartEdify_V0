# Plan de Finalización para Auth-Service (Producción)

**Documento Propietario:** CTO
**Estado:** Activo
**Objetivo:** Completar al 100% los bloqueadores para el pase a producción del `auth-service`.

---

## Resumen Ejecutivo

Este plan detalla las tareas atómicas y medibles necesarias para resolver los dos bloqueadores críticos identificados en la auditoría:
1.  **Calidad y Pruebas:** Alcanzar una cobertura de pruebas de código ≥80%.
2.  **Gestión de Roles y Permisos:** Definir e implementar una estrategia clara para la gestión de `claims`.

La finalización de este plan es un requisito **no negociable** para el despliegue en producción.

---

## 1. Bloqueador: Calidad y Pruebas (Objetivo: ≥80% Cobertura)

**Estado Actual:** 60%
**Responsable:** Líder Técnico de Backend

### Fase 1: Análisis y Refactorización (Prerrequisitos)

*   **[TAREA-Q1] Configurar Reporte de Cobertura en CI:**
    *   **Descripción:** Modificar el pipeline de CI/CD para que el job de pruebas (`npm test`) genere un reporte de cobertura (ej. LCOV) y lo publique en un lugar accesible (ej. como un artefacto de CI, o usando herramientas como Codecov/Coveralls).
    *   **Prioridad:** CRÍTICA
    *   **DoD:** El reporte de cobertura es visible y se actualiza con cada commit a la rama principal.

*   **[TAREA-Q2] Refactorizar Handlers para Extraer Lógica de Negocio:**
    *   **Descripción:** La lógica de negocio actualmente reside en los handlers de Express, lo que dificulta las pruebas unitarias. Se debe extraer esta lógica a "servicios" o "casos de uso" puros e inyectarlos en los handlers.
        *   `login.handler.ts` -> `login.service.ts`
        *   `register.handler.ts` -> `register.service.ts`
        *   `refresh.handler.ts` -> `refresh.service.ts`
        *   `reset-password.handler.ts` -> `reset-password.service.ts`
    *   **Prioridad:** ALTA
    *   **DoD:** Los handlers solo se ocupan de la validación de DTOs y de la orquestación de la respuesta HTTP. La lógica principal es testeable de forma aislada.

### Fase 2: Implementación de Pruebas

*   **[TAREA-Q3] Implementar Pruebas Unitarias para Servicios Extraídos:**
    *   **Descripción:** Escribir pruebas unitarias (`*.test.ts`) para cada función en los nuevos archivos de servicio. Estas pruebas deben mockear las dependencias externas (BD, Redis) y cubrir todos los caminos lógicos.
    *   **Prioridad:** ALTA
    *   **DoD:** Cobertura unitaria de la capa de servicio > 90%.

*   **[TAREA-Q4] Implementar Pruebas de Integración para Casos Negativos:**
    *   **Descripción:** Añadir pruebas de integración (`*.integration.test.ts`) que cubran explícitamente los "caminos tristes" o de error.
        *   Login con contraseña incorrecta.
        *   Uso de un refresh token expirado o ya utilizado.
        *   Petición de reseteo de contraseña para un email inexistente.
        *   Activación del `rate-limiter` tras múltiples intentos fallidos.
    *   **Prioridad:** ALTA
    *   **DoD:** Al menos 4 nuevas suites de pruebas de integración que validen estos escenarios.

### Fase 3: Verificación

*   **[TAREA-Q5] Validar Cobertura y Actualizar Documentación:**
    *   **Descripción:** Ejecutar el pipeline de CI y confirmar que el reporte de cobertura global para el `auth-service` es igual o superior al 80%. Actualizar el documento `testing/auth-service-strategy.md` para reflejar el nuevo estándar.
    *   **Prioridad:** MEDIA
    *   **DoD:** Pipeline en verde con cobertura ≥80%. Documento de estrategia actualizado.

---

## 2. Bloqueador: Gestión de Roles y Permisos

**Estado Actual:** 20% (No definido)
**Responsable:** CTO y Arquitecto de Software

### Fase 1: Definición Arquitectónica

*   **[TAREA-R1] Conducir Reunión de Decisión Arquitectónica (ADR):**
    *   **Descripción:** Agendar y moderar una reunión con los líderes técnicos de `auth-service`, `tenant-service` y `user-service`.
    *   **Prioridad:** CRÍTICA
    *   **DoD:** Minuta de la reunión con la decisión tomada.

*   **[TAREA-R2] Documentar la Decisión en un Nuevo ADR:**
    *   **Descripción:** Crear el archivo `design/adr/ADR-003-Role-Claim-Resolution.md`. Este documento debe formalizar cómo `auth-service` obtiene los roles y permisos de un usuario. La decisión probable es: *"`auth-service` consultará en tiempo real al `tenant-service` vía HTTP al momento de acuñar un nuevo JWT"*. El ADR debe incluir un diagrama de secuencia.
    *   **Prioridad:** CRÍTICA
    *   **DoD:** El ADR es aprobado y mergeado a la rama principal.

### Fase 2: Implementación

*   **[TAREA-R3] Implementar Cliente HTTP para Tenant-Service:**
    *   **Descripción:** Crear un adaptador `tenant-service.client.ts` dentro de `auth-service/internal/adapters/`. Este cliente encapsulará la llamada HTTP al endpoint del `tenant-service` que expone los roles del usuario. Debe incluir manejo de timeouts y un mock para las pruebas.
    *   **Prioridad:** ALTA
    *   **DoD:** El cliente está implementado y es capaz de realizar una llamada mockeada.

*   **[TAREA-R4] Modificar Flujos de Emisión de Tokens:**
    *   **Descripción:** Actualizar el `login.service.ts` y el `refresh.service.ts` para que:
        1. Después de validar las credenciales del usuario, llamen al `tenant-service.client` para obtener sus roles.
        2. Incorporen los roles obtenidos como un `claim` personalizado (ej. `permissions`) en el payload del JWT.
    *   **Prioridad:** ALTA
    *   **DoD:** Los JWT emitidos tras un login o refresh contienen los `claims` de permisos.

### Fase 3: Pruebas y Verificación

*   **[TAREA-R5] Implementar Pruebas de Integración para Claims:**
    *   **Descripción:** Crear una nueva suite de pruebas de integración (`claims.integration.test.ts`) que mockee la respuesta del `tenant-service.client`. La prueba debe realizar un login y luego decodificar el JWT resultante para verificar que los `claims` de permisos son los esperados.
    *   **Prioridad:** ALTA
    *   **DoD:** Pipeline en verde con la nueva suite de pruebas.

*   **[TAREA-R6] Implementar Prueba de Contrato:**
    *   **Descripción:** (Opcional pero recomendado) Utilizar una herramienta como Pact o Schemathesis para crear una prueba de contrato que asegure que el `auth-service` (consumidor) y el `tenant-service` (proveedor) no rompan la estructura de la petición/respuesta de roles.
    *   **Prioridad:** MEDIA
    *   **DoD:** La prueba de contrato se ejecuta como parte del pipeline de CI.
