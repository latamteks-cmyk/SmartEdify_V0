# 🚀 Plan de Acciones Atómicas - SmartEdify

**Fecha:** 20 de Septiembre, 2025  
**Versión:** 2.0  
**Objetivo:** Completar SmartEdify para producción en 21 semanas

---

## 📋 Estado Actual del Proyecto

### ✅ **Completado (Según docs/status.md):**

#### **Auth Service - ESTABLE**
- [x] Rotación JWKS dual (current/next) con cron manual + alarmas
- [x] Métricas de negocio publicadas (login_success, login_fail, password_reset, refresh_reuse)
- [x] Tracing OTel mínimo en login, refresh, register
- [x] Pruebas unitarias y de contrato verdes sin warnings
- [x] Supply-chain: SBOM + firmas Cosign + gate bloqueante

#### **Tenant Service - FASE 0 COMPLETA**
- [x] Scaffold con migraciones idempotentes
- [x] Gauges de outbox/DLQ publicados
- [x] Endpoint membership overlap en desarrollo
- [x] Cache de contexto definido (no implementado)

#### **User Service - SCAFFOLD BÁSICO**
- [x] Scaffold extendido con listener user.registered
- [x] Esquema base de migraciones

---

## 🎯 **Próximas Tareas Prioritarias (Próximos 14 días)**

### **Semana Actual: Estabilización y Contract Testing**

#### 🎯 **Tarea 1: Completar Contract Tests Auth-Tenant** 🔄 **CRÍTICO**
- **Responsable**: QA Engineer + Backend Dev
- **Duración**: 3 días
- **Descripción**:
  - Finalizar Spectral + snapshots sanitizados
  - Implementar contract tests Auth/Tenant end-to-end
  - Configurar pipeline que falle ante breaking changes
- **Criterios de Aceptación**:
  - [ ] Pipeline Spectral operativo con exit code 0
  - [ ] Contract tests Auth/Tenant completos
  - [ ] Snapshots sanitizados (login, refresh, forgot/reset, register)
  - [ ] CI falla ante breaking changes API
- **Riesgo**: Alto - Regresiones API silenciosas

#### 🎯 **Tarea 2: Extender Tracing Distribuido** 🔄 **ALTA PRIORIDAD**
- **Responsable**: Backend Dev 1
- **Duración**: 2 días
- **Descripción**:
  - Instrumentar tracing en tenant-context y outbox
  - Publicar tableros iniciales en Grafana
  - Configurar correlación de requests cross-service
- **Criterios de Aceptación**:
  - [ ] Tracing en tenant-context operativo
  - [ ] Tracing en outbox/DLQ implementado
  - [ ] Dashboard Grafana con trazas distribuidas
  - [ ] Correlación x-request-id funcional
- **Riesgo**: Medio - Diagnóstico degradado sin trazas

#### 🎯 **Tarea 3: Métricas de Negocio Tenant** 🔄 **MEDIA PRIORIDAD**
- **Responsable**: Backend Dev 2
- **Duración**: 3 días
- **Descripción**:
  - Definir KPIs de negocio para Tenant Service
  - Implementar gauges/counters (tenants activos, memberships vigentes)
  - Exponer métricas en /metrics endpoint
  - Configurar alertas básicas
- **Criterios de Aceptación**:
  - [ ] Métricas tenants_active, memberships_active
  - [ ] Counters tenant_created, membership_created
  - [ ] Dashboard con métricas de negocio
  - [ ] Alertas configuradas para anomalías
- **Riesgo**: Medio - Falta visibilidad activaciones

### **Semana 2: User Service MVP**

#### 🎯 **Tarea 4: Completar User Service CRUD** 🔄 **ALTA PRIORIDAD**
- **Responsable**: Backend Dev 1
- **Duración**: 5 días
- **Descripción**:
  - Definir contrato OpenAPI completo
  - Implementar endpoints CRUD básicos
  - Integrar con Auth Service para validación JWT
  - Configurar migraciones y repositorios
- **Criterios de Aceptación**:
  - [ ] OpenAPI spec completa y validada
  - [ ] Endpoints POST/GET/PUT/DELETE /users
  - [ ] Validación JWT en endpoints protegidos
  - [ ] Migraciones ejecutables
  - [ ] Tests unitarios básicos
- **Dependencias**: Auth Service estable

#### 🎯 **Tarea 5: Implementar Cache Tenant Context** 🔄 **MEDIA PRIORIDAD**
- **Responsable**: Backend Dev 2
- **Duración**: 2 días
- **Descripción**:
  - Implementar cache Redis para tenant-context
  - Configurar TTL y invalidación
  - Añadir métricas hit/miss ratio
- **Criterios de Aceptación**:
  - [ ] Cache Redis funcional
  - [ ] TTL configurable
  - [ ] Invalidación automática
  - [ ] Métricas de cache
- **Dependencias**: Tenant Service estable

### **Semana 3: Automatización y Seguridad**

#### 🎯 **Tarea 6: Automatizar Rotación JWKS** 🔄 **ALTA PRIORIDAD**
- **Responsable**: DevOps Engineer + Backend Dev
- **Duración**: 3 días
- **Descripción**:
  - Implementar cron job para rotación automática
  - Crear verificación post-rotación
  - Configurar short deny-list para access tokens
- **Criterios de Aceptación**:
  - [ ] Cron job rotación automática
  - [ ] Verificación post-rotación
  - [ ] Deny-list access tokens
  - [ ] Alertas de fallos de rotación
- **Riesgo**: Medio - Ventana reutilización tokens

#### 🎯 **Tarea 7: Políticas de Admisión OPA** 🔄 **MEDIA PRIORIDAD**
- **Responsable**: DevOps Engineer
- **Duración**: 4 días
- **Descripción**:
  - Implementar políticas OPA que consuman Cosign/SBOM
  - Configurar validación en runtime
  - Documentar procedimientos de admisión
- **Criterios de Aceptación**:
  - [ ] Políticas OPA operativas
  - [ ] Validación Cosign en runtime
  - [ ] SBOM verificado en despliegues
  - [ ] Documentación completa
- **Dependencias**: Supply-chain pipeline estable

---

## 📊 **Métricas de Progreso**

### **Baseline Actual (según status.md):**
- p95 login latency: 285ms
- login success ratio: 89%
- refresh reuse detections: 0
- outbox_pending p95 age: 90s
- cobertura integration auth: 72%

### **Objetivos T+14d:**
- p95 login latency: < 250ms
- login success ratio: > 92%
- refresh reuse detections: 0 (alerta si >0)
- outbox_pending p95 age: < 90s
- cobertura integration auth: ≥ 80%

---

## 🚨 **Riesgos Identificados**

### **Críticos:**
1. **Contract tests incompletos** - Regresiones API silenciosas
2. **Tracing parcial** - Diagnóstico degradado

### **Medios:**
1. **Métricas negocio Tenant ausentes** - Falta visibilidad
2. **Logout sin invalidación estricta** - Ventana reutilización tokens
3. **Falta gate cobertura CI** - Regresiones silenciosas

---

## 🎯 **Acciones Inmediatas (Próximas 72h)**

- [ ] Publicar pipeline Spectral que falle ante breaking changes
- [ ] Instrumentar tracing en tenant-context y colas outbox
- [ ] Configurar dashboard Grafana con métricas Auth negocio
- [ ] Preparar script automation rotación JWKS (dry-run staging)

---

## 📋 **Roadmap Extendido (Semanas 4-21)**

### **Semanas 4-6: Gateway Service**
- Implementar routing a servicios backend
- Validación JWT centralizada con JWKS
- CORS y rate limiting robusto
- Observabilidad completa

### **Semanas 7-10: Frontend Integration**
- Conectar Admin Portal con APIs reales
- Conectar User Portal con backend
- Testing E2E frontend-backend

### **Semanas 11-18: Assembly Service**
- Scaffold y arquitectura base
- CRUD de asambleas básico
- Sistema de votación
- Integración con Google Meet

### **Semanas 19-21: Production Hardening**
- Migrar a KMS para gestión de secretos
- Load testing completo
- Runbooks operativos completos
- Go-live y validación

---

*Plan actualizado basado en estado real del proyecto*  
*Fecha: 20 de Septiembre, 2025*  
*Próxima revisión: Cada viernes*