# SmartEdify Task Overview

This high-level tracker summarizes priorities from the detailed backlog in [`docs/tareas.md`](docs/tareas.md). Update statuses here first, then synchronize finer-grained items in the referenced sections as needed.

## Foundational Standards
- [x] Establish monorepo structure, service templates, and baseline documentation. ([details](docs/tareas.md#estructura-y-premisas))
- [ ] Complete shared diagrams, API specifications, and SRE alert definitions. ([details](docs/tareas.md#estructura-y-premisas))

## Auth Service
- [x] Maintain core scaffolding, security baselines, and initial observability coverage. ([details](docs/tareas.md#auth-service))
- [ ] Finalize API documentation, validation, and cross-service integration. ([details](docs/tareas.md#auth-service))
- [ ] Close remaining security, migration, and testing checklists. ([details](docs/tareas.md#auth-service))
- [ ] Deliver observability metrics, business instrumentation, and SRE alerts. ([details](docs/tareas.md#auth-service))
- [x] Harden CI/CD pipeline, supply-chain safeguards, and runtime resiliency. _(2025-09-23: Gate Cosign bloqueante, fallback KMS/Secrets y plan on-call documentados)._ ([details](docs/tareas.md#auth-service))

## User Service
- [x] Complete service scaffolding and baseline documentation. ([details](docs/tareas.md#user-service))
- [ ] Build CRUD endpoints, enforce security, and validate persistence layers. ([details](docs/tareas.md#user-service))
- [ ] Establish testing, observability, and CI/CD coverage. ([details](docs/tareas.md#user-service))

## Assembly Service
- [ ] Stand up service foundations, flows, and integrations with Auth/User. ([details](docs/tareas.md#assembly-service))

## Cross-Cutting Initiatives
- [ ] Standardize linting, commit conventions, and coverage reporting. ([details](docs/tareas.md#tareas-transversales-calidad-cicd-seguridad-observabilidad-documentación))
- [ ] Audit CI/CD promotion steps, changelog generation, and supply-chain controls. _(2025-09-23: Proceso Auth documentado; pendiente automatizar changelog global)._ ([details](docs/tareas.md#tareas-transversales-calidad-cicd-seguridad-observabilidad-documentación))
- [x] Enforce structured JSON logging across services. ([details](docs/tareas.md#tareas-transversales-calidad-cicd-seguridad-observabilidad-documentación))
- [ ] Define business metrics and lifecycle for API contracts. ([details](docs/tareas.md#tareas-transversales-calidad-cicd-seguridad-observabilidad-documentación))
- [ ] Implementar políticas de admisión/OPA que consuman verificaciones Cosign/SBOM en runtime. ([details](docs/tareas.md#tareas-transversales-calidad-cicd-seguridad-observabilidad-documentación))

## Tenant Service Roadmap
- [x] Deliver foundation scope (OpenAPI v0.1, migrations, initial metrics). ([details](docs/tareas.md#fase-0-fundaciones))
- [x] Complete admin transfer capabilities and events. ([details](docs/tareas.md#fase-1-unicidad-admin--eventos))
- [ ] Implement unit and membership lifecycle with events/metrics. ([details](docs/tareas.md#fase-2-unidades-y-memberships))
- [ ] Introduce delegation flows, automation, and observability. ([details](docs/tareas.md#fase-3-delegaciones-y-delegación-temporal))
- [ ] Integrate tenant context with Auth and add caching strategy. ([details](docs/tareas.md#fase-4-contexto-y-versionado))

---

_For historical context and granular tasks, refer to [`docs/tareas.md`](docs/tareas.md)._
