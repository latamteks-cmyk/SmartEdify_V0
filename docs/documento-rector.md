# Documento Rector — SmartEdify_V0

## 1. Visión global
Objetivo: plataforma SaaS modular para educación. Tres dominios: User Portal, Admin Portal, Mobile App. **TODO** confirmar alcance MVP por dominio.

## 2. Áreas críticas detectadas
- JWKS rotation incompleta.
- Broker y DLQ pendientes.
- CI sin gates de cobertura y seguridad en `main`.
- Placeholders sensibles en `.env` y compose.

## 3. Dominios
### 3.1 User Portal
Funciones: registro, login, perfil, recuperación de contraseña. **TODO** flujos y vistas.

### 3.2 Admin Portal
Funciones: gestión de tenants, usuarios, roles, límites. **TODO** permisos y auditoría.

### 3.3 Mobile App
Funciones: autenticación, perfil, notificaciones. **TODO** alcance inicial.

## 4. Arquitectura global
Resumen en `docs/architecture/overview.md`. Diagramas en `docs/architecture/diagrams/*`.
Ver `docs/architecture/diagrams/network-ports.mmd` para puertos y relaciones, y `plans/gateway/gateway-service.md` para el BFF.

## 5. Catálogo de funciones y endpoints
| Dominio | Función | Servicio | Endpoint | Método | Auth |
|---|---|---|---|---|---|
| User | Login | auth | `/auth/login` | POST | público |
| User | JWKS | auth | `/.well-known/jwks.json` | GET | público |
| User | Perfil | user | `/users/me` | GET | bearer |
| Admin | Tenants | tenant | `/tenants` | POST | admin |
| Admin | Usuarios | user | `/admin/users` | GET | admin |
**TODO** completar desde OpenAPI.

## 6. Plan por microservicio
- auth-service: implementar rotación JWKS y revocación. Métricas por `kid`. Pruebas de compatibilidad.
- user-service: contratos OpenAPI, caché selectiva, tests de integración.
- tenant-service: eventos `tenant.provisioned`, límites por plan, DLQ.

## 7. Roadmap
- T1: seguridad y CI. T2: broker NATS y eventos. T3: gateway y permisos finos.

## 8. Buenas prácticas
Un servicio = una responsabilidad. Seguridad por defecto. Observabilidad integral. CI/CD con rollback. Límites de costo definidos.

## 9. ADRs globales
- ADR-0007 JWKS rotation. **TODO** ADR mensajería, multitenancy, autorización.

## 10. Apéndices
- Glosario, referencias y *runbooks*. **TODO**
- Auditorías periódicas: ver `docs/audits/2025-09-16-structure.md`.
