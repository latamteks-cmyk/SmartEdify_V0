
---
title: "ADR-20250914-2: Separación de Tenant Service"
date: 2025-09-14
status: Propuesto (aceptación implícita tras actualización de documentación)
authors: [Equipo Backend SmartEdify]

# ADR-20250914-2: Separación de Tenant Service

## Tabla de Contenido
1. [Contexto](#contexto)
2. [Decisión](#decisión)
3. [Alternativas Consideradas](#alternativas-consideradas)
4. [Consecuencias](#consecuencias)
5. [Métricas de Éxito](#métricas-de-éxito)
6. [Plan de Implementación](#plan-de-implementación)
7. [Riesgos y Mitigaciones](#riesgos-y-mitigaciones)
8. [Estado Futuro](#estado-futuro)
9. [Referencias](#referencias)

---

## 1. Contexto
El documento `incorporacion.md` y requerimientos de onboarding mezclaban identidad (Auth/User) con gobierno de condominios (unidades, delegaciones, unicidad de administrador). Incluir toda la gobernanza en Auth o User aumenta el riesgo de un servicio monolítico de identidad difícil de versionar y escalar, comprometiendo separación de responsabilidades y ciclos de despliegue independientes.

## 2. Decisión
Crear un **Tenant Service** dedicado responsable de:
- Tenants (condominios) y sus metadatos.
- Unidades físicas y jerarquías.
- Memberships usuario↔unidad (owner/renter/family) con vigencias.
- Posiciones de gobernanza (admin/presidente/vicepresidente/tesorero) y transferencias/delegaciones.
- Políticas configurables (unicidad admin, límites delegación, etc.).
- Emisión de eventos de dominio y endpoint de contexto (`/tenant-context`).

Auth Service se limita a identidad, autenticación y emisión de tokens; User Service a perfil y atributos personales. Ninguno almacena unidades ni lógica de gobierno.

## 3. Alternativas Consideradas
1. Mantener gobernanza en Auth Service.
   - Pros: Menos servicios iniciales.
   - Contras: Crece superficie crítica (seguridad + negocio), despliegues más riesgosos, tokens potencialmente inflados.
2. Colocar gobernanza en User Service.
   - Pros: Cercano a datos de usuario.
   - Contras: Mezcla PII con estructura organizativa; dificulta aplicar controles de acceso y auditoría independiente.
3. Tenant Service + librería compartida para políticas (ELEGIDA parcialmente más adelante).
   - Pros: Permite reutilizar validaciones sin acoplar servicios.
   - Contras: Complejidad inicial adicional.

## 4. Consecuencias
**Positivas:**
- Bounded context claro; cambios de gobierno no requieren redeploy de autenticación.
- JWT liviano (claims agregados y versionados) reduciendo riesgos de exposición masiva.
- Escalabilidad independiente (consultas de unidades/quórum aisladas).
- Auditoría y hash chain de gobernanza centralizados.

**Negativas / Costos:**
- Mayor número de servicios y despliegues.
- Necesidad de endpoint adicional (`/tenant-context`) y caching.
- Complejidad de orquestación en onboarding (sagas / eventos).

## 5. Métricas de Éxito
- Latencia P95 `/tenant-context` < 40ms.
- Tamaño promedio de JWT estable (< 2KB) sin crecimiento lineal con unidades.
- < 1% de errores 5xx en endpoints governance.
- Detección de conflictos (unicidad admin / solapamiento memberships) con métricas (`governance_transfer_total{result="conflict"}` < 2% del total).

## 6. Plan de Implementación
Fase 0: OpenAPI v0.1 + migraciones + outbox.
Fase 1: Transferencia admin + evento `governance.changed`.
Fase 2: Unidades y memberships + validaciones de solapamiento.
Fase 3: Delegaciones temporales + expiración TTL.
Fase 4: Contexto versionado + integración Auth tokens.
Fase 5: Políticas avanzadas + auditoría extendida + hardening.

## 7. Riesgos y Mitigaciones
| Riesgo | Mitigación |
|--------|------------|
| Aumento de latencia en login (fetch contexto) | Cache L1 + versión de contexto |
| Inconsistencia saga onboarding | Outbox eventos + idempotencia |
| Inflado de claims si se requiere demasiada info | Limitar a roles agregados + endpoint on-demand |
| Fuga de datos multi-tenant | Middleware scoping + tests dedicados |

## 8. Estado Futuro
- Evaluar Row Level Security en Postgres si volumen y riesgos justifican.
- Introducir motor de políticas ABAC por tenant.
- Snapshots periódicos de chain hash de gobernanza para verificación.

## 9. Referencias
- `analisis.md`
- `spec.md`
- `incorporacion.md` (a adaptar)
- ADR 20250914-argon2-jwt-separation.md
- [ARCHITECTURE.md](../../../ARCHITECTURE.md)

---
Documento vivo: actualizar si cambian límites de responsabilidad o estrategia de contexto.