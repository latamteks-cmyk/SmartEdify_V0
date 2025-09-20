# SmartEdify Task Overview

**Fecha:** 20 de Septiembre, 2025  
**Versión:** 3.0 - Consolidado  
**Objetivo:** Completar SmartEdify para producción en 21 semanas

---

## 📊 Estado Actual Validado (20 Sep 2025)

### ✅ **COMPLETADO Y VERIFICADO:**

#### **Auth Service - ESTABLE**
- [x] Rotación JWKS dual (current/next) con cron manual + alarmas
- [x] Métricas de negocio publicadas (login_success, login_fail, password_reset, refresh_reuse)
- [x] Tracing OTel mínimo en login, refresh, register
- [x] Supply-chain: SBOM + firmas Cosign + gate bloqueante
- [x] Harden CI/CD pipeline, supply-chain safeguards, and runtime resiliency
- ⚠️ **ISSUE**: Tests fallan por problemas de migraciones ES modules

#### **Tenant Service - FASE 0 COMPLETA**
- [x] Scaffold con migraciones idempotentes
- [x] Gauges de outbox/DLQ publicados
- [x] Endpoint membership overlap en desarrollo
- [x] Cache de contexto definido (no implementado)
- ⚠️ **ISSUE**: Tests fallan por dependencias compartidas faltantes (@smartedify/shared/*)

#### **User Service - SCAFFOLD BÁSICO CON TESTS VERDES**
- [x] Scaffold extendido con listener user.registered
- [x] OpenAPI spec completa y validada (api/openapi/user.yaml)
- [x] CRUD básico implementado con base de datos en memoria
- [x] Tests unitarios e integración pasando (5/5 tests ✅)
- [x] Handlers HTTP funcionales: POST/GET/PUT/DELETE /users

---

## 🎯 **TAREAS CRÍTICAS INMEDIATAS (Próximos 7 días)**

### **Prioridad 1: Resolver Issues de Testing**

#### 🔥 **Tarea 1.1: Arreglar Auth Service Tests**
- **Responsable**: Backend Dev 1
- **Duración**: 1 día
- **Descripción**: Resolver problemas de migraciones ES modules
- **Criterios de Aceptación**:
  - [ ] Tests Auth Service pasan sin errores
  - [ ] Migraciones ejecutan correctamente
  - [ ] CI pipeline verde
- **Estado**: 🔴 BLOQUEANTE

#### 🔥 **Tarea 1.2: Arreglar Tenant Service Dependencies**
- **Responsable**: Backend Dev 2
- **Duración**: 1 día
- **Descripción**: Resolver dependencias compartidas faltantes
- **Criterios de Aceptación**:
  - [ ] Tests Tenant Service pasan sin errores
  - [ ] Dependencias @smartedify/shared/* resueltas
  - [ ] Integración con DB funcional
- **Estado**: 🔴 BLOQUEANTE

### **Prioridad 2: Completar User Service MVP**

#### 🎯 **Tarea 2.1: Migrar User Service a PostgreSQL**
- **Responsable**: Backend Dev 1
- **Duración**: 3 días
- **Descripción**: Reemplazar base de datos en memoria por PostgreSQL
- **Criterios de Aceptación**:
  - [ ] Migraciones PostgreSQL implementadas
  - [ ] Repositorios con queries SQL reales
  - [ ] Tests de integración con DB real
  - [ ] Mantener tests verdes
- **Estado**: 🟡 ALTA PRIORIDAD

#### 🎯 **Tarea 2.2: Implementar Autenticación JWT**
- **Responsable**: Backend Dev 2
- **Duración**: 2 días
- **Descripción**: Integrar validación JWT en endpoints protegidos
- **Criterios de Aceptación**:
  - [ ] Middleware JWT implementado
  - [ ] Validación con Auth Service
  - [ ] Endpoints protegidos funcionales
  - [ ] Tests de autorización
- **Estado**: 🟡 ALTA PRIORIDAD

#### 🎯 **Tarea 2.3: Añadir Endpoints Profile/Preferences**
- **Responsable**: Backend Dev 1
- **Duración**: 2 días
- **Descripción**: Implementar endpoints self-service
- **Criterios de Aceptación**:
  - [ ] GET/PUT /profile implementados
  - [ ] GET/PUT /preferences implementados
  - [ ] Validación con Zod
  - [ ] Tests completos
- **Estado**: 🟡 MEDIA PRIORIDAD

### **Prioridad 3: Contract Testing y Observabilidad**

#### 🎯 **Tarea 3.1: Completar Contract Tests Auth-Tenant**
- **Responsable**: QA Engineer
- **Duración**: 2 días
- **Descripción**: Finalizar contract testing entre servicios
- **Criterios de Aceptación**:
  - [ ] Pipeline Spectral operativo
  - [ ] Contract tests Auth/Tenant completos
  - [ ] CI falla ante breaking changes
- **Estado**: 🟡 ALTA PRIORIDAD

#### 🎯 **Tarea 3.2: Extender Tracing Distribuido**
- **Responsable**: Backend Dev 2
- **Duración**: 2 días
- **Descripción**: Instrumentar tracing en tenant-context y outbox
- **Criterios de Aceptación**:
  - [ ] Tracing en tenant-context operativo
  - [ ] Dashboard Grafana con trazas
  - [ ] Correlación x-request-id funcional
- **Estado**: 🟡 MEDIA PRIORIDAD

---

## 📋 **ROADMAP EXTENDIDO (Semanas 2-21)**

### **Semanas 2-3: Estabilización Core**
- [ ] Métricas de negocio Tenant Service
- [ ] Cache Redis para tenant-context
- [ ] Automatizar rotación JWKS
- [ ] Políticas de admisión OPA

### **Semanas 4-6: Gateway Service**
- [ ] Implementar routing a servicios backend
- [ ] Validación JWT centralizada con JWKS
- [ ] CORS y rate limiting robusto
- [ ] Observabilidad completa

### **Semanas 7-10: Frontend Integration**
- [ ] Conectar Admin Portal con APIs reales
- [ ] Conectar User Portal con backend
- [ ] Testing E2E frontend-backend

### **Semanas 11-18: Assembly Service**
- [ ] Scaffold y arquitectura base
- [ ] CRUD de asambleas básico
- [ ] Sistema de votación
- [ ] Integración con Google Meet

### **Semanas 19-21: Production Hardening**
- [ ] Migrar a KMS para gestión de secretos
- [ ] Load testing completo
- [ ] Runbooks operativos completos
- [ ] Go-live y validación

---

## 🚨 **RIESGOS Y BLOCKERS ACTUALES**

### **Críticos (Requieren Acción Inmediata):**
1. **Auth Service Tests Failing** - Bloquea desarrollo
2. **Tenant Service Dependencies Missing** - Bloquea integración
3. **Database Setup Issues** - Impacta desarrollo local

### **Altos:**
1. **User Service en Memoria** - No production-ready
2. **Contract Tests Incompletos** - Riesgo regresiones
3. **Falta Autenticación JWT** - Seguridad comprometida

### **Medios:**
1. **Tracing Parcial** - Diagnóstico limitado
2. **Métricas Negocio Faltantes** - Visibilidad reducida
3. **Cache No Implementado** - Performance subóptima

---

## 📊 **MÉTRICAS DE PROGRESO**

### **Estado de Tests (Validado 20 Sep 2025):**
- ✅ User Service: 5/5 tests passing
- ❌ Auth Service: Tests failing (migration issues)
- ❌ Tenant Service: Tests failing (dependency issues)

### **Cobertura de Funcionalidad:**
- Auth Service: 85% completo
- Tenant Service: 70% completo  
- User Service: 40% completo (scaffold + tests)
- Gateway Service: 0% completo
- Assembly Service: 0% completo

### **Objetivos Próximos 7 días:**
- Resolver todos los tests failing
- User Service con PostgreSQL funcional
- Contract tests operativos
- Tracing distribuido básico

---

## 🎯 **ACCIONES INMEDIATAS (Próximas 24h)**

- [ ] **CRÍTICO**: Arreglar migraciones Auth Service
- [ ] **CRÍTICO**: Resolver dependencias Tenant Service
- [ ] **ALTA**: Iniciar migración User Service a PostgreSQL
- [ ] **MEDIA**: Configurar pipeline Spectral

---

## 📞 **ESCALATION**

**Si blockers no se resuelven en 48h:**
- Escalar a Tech Lead para revisión arquitectónica
- Considerar rollback a versión estable
- Evaluar recursos adicionales

---

*Documento consolidado basado en validación real del código*  
*Última actualización: 20 Sep 2025, 11:35 AM*  
*Próxima revisión: Diaria hasta resolver blockers críticos*
