# SOFTWARE ARCHITECTURE — SmartEdify

**Plataforma SaaS para gestión integral de inmuebles, condominios y comunidades inmobiliarias**

---

## Control del documento

| Campo | Valor |
|---|---|
| **Código** | DOC-SW-ARCH-01 |
| **Versión** | **2.0** |
| **Fecha de emisión** | 26 de julio de 2026 |
| **Estado** | Línea base revisada — pendiente de re-aprobación (Anexo G) |
| **Reemplaza a** | DOC-SW-ARCH-01 v1.1 (20/07/2026) |
| **Propietario** | Product Owner — SmartEdify |
| **Custodio técnico** | Software Architect / Software Lead |
| **Documentos hijos** | DOC-PROD-EPC-01 (Mapa Funcional de Servicios y Épicas), DOC-PROD-SVC-01 (Cartera de Servicios), DOC-SW-BLG-01 (Catálogo de Tasks) |
| **Insumo de revisión** | DOC-REV-01 — Revisión crítica ARCH/EPC (26/07/2026) |
| **Clasificación** | Uso interno / controlado |
| **Próxima revisión obligatoria** | Al cierre de ARG-2, o ante cambio material previo |

### Regla de versionado de este documento

Este documento usa versionado semántico documental: **MAYOR** para cambios que alteran decisiones de arquitectura, ownership de datos o fases; **MENOR** para adiciones que no invalidan decisiones vigentes; **PARCHE** para correcciones editoriales. **La versión y la fecha son únicas y aparecen idénticas en portada, encabezado y pie.** Ningún documento hijo puede referenciar este documento sin indicar versión exacta.

---

## Historial de revisiones

| Versión | Fecha | Descripción | Responsable |
|---|---|---|---|
| 1.0 | 21/07/2026 | Emisión inicial. *(Defecto conocido: los encabezados internos declaraban erróneamente v1.1/20-07-2026)* | Software Architect |
| 1.1 | — | **Anulada.** Nunca existió como versión aprobada; era un artefacto de plantilla. Corregido en v2.0 | — |
| **2.0** | **26/07/2026** | Revisión integral tras DOC-REV-01. Ver *Registro de cambios* | Software Architect / PO |

---

## Registro de cambios respecto de v1.0

Cada cambio se rastrea al hallazgo que lo motiva, para que la revisión pueda auditarse.

| Hallazgo | Cambio introducido en v2.0 | Sección |
|---|---|---|
| H-01 | Control de versiones unificado; historial de revisiones añadido | Portada |
| H-03, H-04 | Modelo único de gates: ARG técnico + G comercial, con mapeo, aprobador y evidencia | §4.3 |
| H-05 | Familias de servicio (`PLT/CORE/OPS/GOV/ECO/ENT`) desacopladas de capas; `layer` y `phase` como metadatos | §5.1, §16.5 |
| G-01 | Nuevo contexto **D20 Onboarding & Migration** y servicio `SVC-PLT-08` | §5.1, §5.13, §6.1 |
| G-02 | Nueva capacidad transversal **Platform Runtime & Delivery** (`SVC-PLT-00`) con alcance y salidas | §5.14, §13 |
| G-03 | Nuevo contexto **D21 Subscription & Metering** y servicio `SVC-CORE-05`, con comprobante electrónico | §5.1, §5.15, §10.10 |
| G-04 | **D04 ampliado** a egresos, fondos y rendición de cuentas | §5.6, §6.4 |
| G-05 | Autoservicio financiero del residente elevado a flujo crítico | §6.3 |
| S-01, S-02 | Cobranza avanzada (aging/dunning) movida a F1; add-ons de estacionamiento y accesos a F3/F4 | §4.2 |
| S-03 | F5 no arranca hasta cerrar ARG-4 | §4.2 |
| C-01 | Fase 1 re-dimensionada; se introduce **F1.5** | §4.2, §4.4 |
| T-01 | Matriz de trazabilidad obligatoria épica ↔ NFR ↔ ADR ↔ riesgo ↔ gate | §16.6 |
| A-01 | Contrato duro de aislamiento RLS (FORCE RLS, roles, `SET LOCAL`, pooler, Prisma) | §9.2 |
| A-02 | Concurrencia de reservas mediante *exclusion constraints* | §9.4 |
| A-03, A-04 | Tipos decimales fijados, saldo derivado, invariantes continuas, alícuotas y residuo | §9.5, §9.6 |
| A-05 | Recibo de voto, encadenamiento por hash y función de quorum versionada | §6.8, §9.7 |
| A-06 | **ADR-006-R**: mensajería sin broker dedicado en F1; Redis diferido a F2 | §8.3, §10.2 |
| A-07 | Topología de cuentas AWS declarada | §8.4 |
| A-08 | Ensayo de portabilidad de IAM como evidencia obligatoria | §10.3 |
| A-09 | *Enforcement* automatizado de fronteras modulares en CI | §8.7 |
| A-10, A-11 | Capítulo de convenciones ampliado y normativo | §14 |
| P-01 | Limitaciones reales de PWA en iOS explicitadas y trasladadas al Gate nativo | §5.4, §5.5 |
| P-02 | Modelo de costo de mensajería actualizado (per-message, cambio de oct-2026) | §10.5 |
| P-03 | Medios de pago locales incorporados a la evaluación | §10.4 |
| P-04 | Declaración de alcance PCI DSS (SAQ A) | §10.4 |
| L-01 | Cadena responsable/encargado documentada | §11.6 |
| L-02 | Runbook de notificación de brecha con reloj regulatorio | §15.3 |
| L-03 | Offboarding, exportación y certificación de eliminación desde F1 | §6.10, §11.8 |
| L-04 | Matriz de retención con columna de fundamento | §9.11 |
| L-05 | Gate legal por tenant para asamblea no presencial | §6.8, §11.7 |
| E-01 | **Portabilidad del condominio entre administradoras**: identidad global de propiedad y flujo de traspaso | §5.3, §6.9 |
| E-02 | Riesgo comercial por ausencia de app nativa registrado | Anexo C |

---

## Aprobación y autoridad

Este documento constituye la línea base integral de arquitectura para el desarrollo de SmartEdify. Las decisiones aquí definidas son obligatorias para Product, Ingeniería, QA, DevSecOps, Seguridad, Operaciones y proveedores, salvo excepción aprobada mediante un Architecture Decision Record (ADR).

| Rol | Responsabilidad de aprobación |
|---|---|
| **Product Owner** | Prioridades, alcance, fases, criterios de valor y aceptación de riesgo de producto |
| **Software Architect / Software Lead** | Arquitectura, estándares de ingeniería, integridad técnica y evolución |
| **Security / Privacy / Compliance** | Controles de seguridad, privacidad, conservación, firma y cumplimiento |
| **Engineering Lead / QA Lead** | Factibilidad, estrategia de construcción, pruebas y calidad de entrega |
| **Operations / SRE** | SLO, capacidad, observabilidad, continuidad, soporte y costos operativos |
| **Legal externo** *(nuevo en v2.0)* | Validación de reglas de gobernanza, retención, firma y protección de datos antes de producción |

**Jerarquía de autoridad.** Ante contradicción: (1) este documento prevalece en decisiones técnicas y de ownership de datos; (2) DOC-PROD-SVC-01 prevalece en cartera y empaquetamiento comercial; (3) DOC-PROD-EPC-01 desarrolla alcance funcional sin poder alterar (1) ni (2). Ninguna especificación funcional puede contradecir los principios, el ownership de datos, los controles ni las decisiones aprobadas aquí.

---

## 1. Resumen ejecutivo

SmartEdify es una plataforma SaaS multi-tenant orientada a empresas administradoras de condominios, con autoservicio para residentes, operación para portería y técnicos, gobierno digital para juntas y trazabilidad para auditoría. Su propuesta de valor se concentra en **reducir carga administrativa, acelerar la cobranza, dar transparencia verificable sobre ingresos y egresos, controlar solicitudes y mantenimiento, y demostrar pagos, decisiones y documentos mediante evidencia verificable**.

La arquitectura adopta un **monolito modular** en TypeScript, Node.js LTS y NestJS, con workers asíncronos separados, PostgreSQL como sistema transaccional, aislamiento por tenant mediante Row-Level Security **forzado**, y objetos S3 para documentos y evidencia. Se despliega sobre servicios administrados en AWS São Paulo, evitando microservicios, Kubernetes y componentes propios de identidad, pagos, mensajería, streaming o firma.

El modelo de entrega es incremental y **cada fase exige evidencia verificable de salida**: primero el núcleo financiero, documental y de atención, incluyendo el ciclo completo de cobranza; luego la operación de reservas y portería; después mantenimiento y transparencia de egresos; a continuación gobernanza digital; y finalmente marketplace, inteligencia artificial, IoT y capacidades Enterprise.

### Decisión central

> SmartEdify **construye** las reglas de negocio diferenciadoras —ledger, cobranza, gobernanza, evidencia y aislamiento— y **compra** las capacidades especializadas o reguladas —identidad, pagos, mensajería, streaming y firma—. La arquitectura prioriza simplicidad operativa, trazabilidad, aislamiento y evolución reversible por encima de la elegancia técnica y de la anticipación de escala.

### Corrección de rumbo introducida en v2.0

Tres decisiones de la línea base anterior se rectifican porque contradecían la propia propuesta de valor o los principios rectores:

1. **La cobranza avanzada vuelve al núcleo.** *Aging*, escalera de recordatorios y evidencia de comunicación de deuda pasan de Fase 3 a Fase 1. Sin ellas, el producto registra deuda pero no acelera cobranza, y el gate de valor del piloto no puede evaluarse.
2. **La transparencia de egresos entra en el alcance.** Fondos, presupuesto multi-fondo, registro de gastos y rendición de cuentas mensual publicable se incorporan a Finance. Un producto cuyo dolor declarado es "conflictos por gastos" no puede carecer de gestión de gastos.
3. **El plan se ajusta a la capacidad real.** La Fase 1 se re-dimensiona y se introduce una Fase 1.5. Mantener fechas reduciendo calidad chocaría contra ARG-2 y contra la Definition of Done.

### Decisiones ejecutivas

| Área | Decisión aprobada | Resultado |
|---|---|---|
| Modelo de producto | Empresa administradora como tenant contractual; condominios como propiedades subordinadas **con identidad global independiente del tenant** | Vista portfolio, operaciones masivas, facturación B2B y portabilidad del condominio |
| Backend | TypeScript strict + Node.js LTS + NestJS; monolito modular y workers | Menor costo de equipo y ruta gradual a servicios |
| Experiencia | Web responsive y PWA-first; aplicación nativa sujeta a Gate económico y técnico | Time-to-market y una base de experiencia común |
| Datos | PostgreSQL administrado, **RLS forzado con rol sin BYPASSRLS**, ledger balanceado con tipos decimales fijados, outbox/inbox y S3 Object Lock selectivo | Integridad, aislamiento verificable y evidencia |
| Mensajería interna | **Outbox transaccional en PostgreSQL + Amazon SQS/EventBridge**; broker dedicado solo con evidencia de necesidad *(ADR-006-R)* | Menos componentes que operar y menor costo fijo |
| Caché | **Redis diferido a F2**; en F1 se usan primitivas de PostgreSQL y controles de edge | Simplicidad operativa deliberada (P-02) |
| IAM | Amazon Cognito; SmartEdify mantiene memberships, roles y permisos de negocio; **ensayo de migración obligatorio** | Autenticación administrada con portabilidad demostrada |
| Pagos | Mercado Pago principal; segundo conector y **medios locales (Yape/Plin, PagoEfectivo) evaluados en F1** | Cobro local efectivo y portabilidad |
| Mensajería externa | SES, FCM, WhatsApp Cloud API con **modelo de costo por categoría de plantilla**, SMS de contingencia | Costo por uso medido y orquestación propia |
| Streaming y firma | Amazon IVS Real-Time y proveedor acreditado integrable por API | Evita construir infraestructura especializada |
| Secuencia | Cobranza completa → Reservas y Front Desk → Maintenance y transparencia → Assembly → Ecosistema | Valor económico antes que superficie funcional |
| Confiabilidad | SLO por tier, RDS Multi-AZ, DR progresivo, **cuentas AWS separadas** y FinOps medido | Resiliencia proporcional a uso e ingresos |
| Gobierno | Un solo tablero de gates (ARG técnico + G comercial) con evidencia generada desde el backlog | Decisiones auditables, no declarativas |

---

## 2. Introducción y alcance

### 2.1 Propósito

Definir la arquitectura funcional, lógica, física, de datos, integración, seguridad y operación que gobierna el ciclo de vida de SmartEdify. El documento traduce la estrategia del producto en decisiones implementables, límites de responsabilidad, estándares obligatorios, requisitos no funcionales, fases de entrega y criterios de evolución.

La arquitectura actúa como contrato entre Product, Ingeniería, QA, Seguridad, DevSecOps/SRE, Operaciones, Legal/Compliance y proveedores.

### 2.2 Definición del producto

SmartEdify es una plataforma B2B2C que permite a una empresa administradora operar múltiples condominios desde una vista de cartera y ofrecer a residentes, juntas, portería, técnicos y proveedores canales especializados. Su núcleo económico es el **control financiero completo —ingresos y egresos—**, operativo, documental y de gobernanza de la administradora.

**Cadena de valor:** Onboarding y datos maestros → Cobranza y conciliación → **Transparencia y rendición de cuentas** → Operación y servicio → Gobernanza y evidencia → Analítica y crecimiento.

### 2.3 Objetivos de arquitectura

- Entregar valor con un equipo pequeño sin introducir complejidad distribuida prematura.
- Aislar organizaciones y condominios de forma **verificable y automáticamente probada** en cada petición, consulta, evento, log y métrica.
- Preservar integridad de pagos, saldos, votos, firmas, documentos y cambios de reglas.
- Permitir que una administradora aumente su cartera sin crecimiento lineal del personal.
- **Preservar la continuidad del expediente del condominio aunque cambie la administradora.**
- Ofrecer experiencias simples, accesibles y tolerantes a baja madurez digital y conectividad variable.
- Mantener portabilidad razonable mediante contratos, adaptadores, contenedores, estándares abiertos e infraestructura como código, **con evidencia de ensayo, no solo declaración**.
- Escalar por evidencia de carga, riesgo, independencia de release o contrato, no por anticipación.

### 2.4 Alcance

- Aplicación web administrativa, experiencias PWA para residentes, juntas, portería y técnicos, portal de proveedores y APIs.
- Dominios de identidad, tenancy, personas, **onboarding y migración**, finanzas de ingreso y egreso, cobranza, **suscripción y medición de consumo**, comunicaciones, tickets, documentos, reservas, control operativo, mantenimiento, gobernanza, cumplimiento, proveedores, analítica e integraciones.
- Datos transaccionales, eventos, archivos, evidencia, búsqueda, read models y analítica.
- Integraciones con IAM, pasarelas, bancos, mensajería, streaming, firma, ERP, servicios gubernamentales e IoT.
- **Plataforma de entrega**: infraestructura como código, ambientes, CI/CD, observabilidad, backups, recuperación, seguridad y FinOps.
- Modelo de entrega desde Foundation & MVP hasta Enterprise Scale.

### 2.5 Fuera de alcance

- ERP contable corporativo completo, entidad financiera o custodia de fondos.
- Plataforma propia de videoconferencia, mensajería, firma digital, certificación o procesamiento de tarjetas.
- CMMS/EAM industrial completo, BIM, gemelo digital, inventario valorizado o compras corporativas en las fases iniciales.
- Sistema físico propietario de control de acceso, cámaras, barreras, cerraduras o hardware.
- Nómina peruana completa antes de la fase Ecosystem & Intelligence.
- Blockchain propia o uso de blockchain como requisito de gobernanza.
- Reconocimiento facial o biometría centralizada en las primeras fases.
- Asesoría legal automática o decisiones normativas autoritativas generadas por inteligencia artificial.
- Diseño visual detallado de pantallas y manuales de usuario.

### 2.6 Convenciones de lectura

| Término | Interpretación |
|---|---|
| **MUST / Debe** | Requisito obligatorio; la excepción requiere ADR y aceptación expresa de riesgo |
| **SHOULD / Debería** | Práctica recomendada; su omisión debe justificarse y quedar registrada |
| **MAY / Puede** | Alternativa permitida según contexto y costo |
| **Tenant** | Organización cliente aislada; por defecto, una empresa administradora |
| **Property / Condominio** | Inmueble o comunidad administrada, **con identidad global estable e independiente del tenant** |
| **Portfolio** | Agrupación de propiedades administradas por un tenant |
| **Junta de propietarios** | Órgano del condominio; puede ser responsable del tratamiento de datos y titular del expediente |
| **Evidencia** | Artefacto cuya integridad, origen, tiempo, versión y conservación deben demostrarse |
| **Sistema autoritativo** | Fuente de verdad del dato o decisión, no sustituible por caché o proveedor externo |
| **Invariante** | Condición que el sistema debe garantizar siempre y que se verifica de forma automática y continua |

---

## 3. Contexto de negocio y principios

### 3.1 Dolores prioritarios

| Dolor | Impacto | Respuesta del producto |
|---|---|---|
| Información fragmentada | Duplicidad, errores y dependencia de personas | Datos maestros, documentos y auditoría centralizados |
| Cobranza y conciliación manual | Saldos desactualizados y alta carga administrativa | Cuotas, pagos, matching determinista, **aging y escalera de cobranza**, excepciones y estado de cuenta |
| Falta de transparencia de gastos | Conflictos, desconfianza y rotación de administradora | **Presupuesto multi-fondo, registro de egresos y rendición de cuentas publicable** |
| Comunicación sin seguimiento | Mensajes sin responsable, versión o evidencia | Comunicados segmentados, tickets, SLA y métricas de lectura |
| Operación reactiva | Mantenimiento tardío, portería manual y proveedores no medidos | Front Desk, OT, planes preventivos, checklists y KPI |
| Gobernanza compleja | Dificultad para convocar, calcular quorum, votar y cerrar actas | Assembly Essentials con reglas versionadas y evidencia verificable |
| Crecimiento lineal de personal | Cada nuevo condominio exige más esfuerzo administrativo | Portfolio, automatización, operaciones masivas y plantillas |
| **Pérdida de historial al cambiar de administradora** | El condominio pierde trazabilidad y la plataforma pierde al cliente | **Identidad global de propiedad y proceso de traspaso con evidencia** |

### 3.2 Drivers de negocio

| Driver | Implicancia arquitectónica |
|---|---|
| Bootstrapping y time-to-market | Servicios administrados, monolito modular, un stack dominante y límites estrictos de alcance |
| Administradoras multi-condominio | Tenant desde el primer release, operaciones bulk, métricas y costos por propiedad |
| Confianza y transparencia | Auditoría completa, evidencia verificable y estados reproducibles |
| Cumplimiento peruano | Reglas versionadas, privacidad por diseño y validación legal antes de producción |
| Adopción B2B2C | PWA mobile-first, accesibilidad y procesos simples por rol |
| Unit economics SaaS | **Medición de consumo real por unidad comercial**, add-ons, cuotas y resiliencia proporcional al ingreso |
| Retención del condominio | Portabilidad y continuidad del expediente como capacidad de producto |
| Ecosistema | APIs, eventos, webhooks y adaptadores sin acceso externo directo a la base de datos |

### 3.3 Atributos de calidad prioritarios

| Prioridad | Atributo | Escenario de calidad | Verificación |
|---|---|---|---|
| 1 | Seguridad y aislamiento | Un usuario no puede consultar ni inferir datos de otro tenant incluso ante una falla de aplicación | Prueba negativa generada sobre el catálogo completo de tablas, en cada build |
| 2 | Integridad y auditabilidad | Cada pago, voto, firma y cambio crítico puede reconstruirse con actor, tiempo, origen y versión | Invariantes continuas + auditoría de acciones críticas |
| 3 | Disponibilidad y recuperación | Las funciones críticas continúan o degradan de forma controlada ante fallas parciales | Restore test verificado y ejercicios programados |
| 4 | Mantenibilidad | Un equipo pequeño entrega cambios frecuentes sin coordinar numerosos servicios independientes | Enforcement de fronteras modulares en CI |
| 5 | Rendimiento | Las operaciones comunes responden dentro de SLO en conexiones móviles reales | RUM + load test por fase |
| 6 | Escalabilidad | Workers y componentes intensivos escalan sin multiplicar todo el núcleo | Prueba 2x del pico y modelo de capacidad |
| 7 | Portabilidad | El dominio no depende de APIs propietarias imposibles de sustituir | **Ensayo de migración documentado por proveedor crítico** |
| 8 | Accesibilidad | Los flujos críticos cumplen WCAG 2.2 AA | Automática + revisión manual |

### 3.4 Principios rectores

| Código | Principio | Aplicación |
|---|---|---|
| P-01 | Dominio antes que tecnología | Las fronteras se definen por capacidades, lenguaje y ownership de datos |
| P-02 | Simplicidad operativa deliberada | No se crea un servicio, clúster, broker o base independiente sin necesidad medible |
| P-03 | Tenant context obligatorio | Toda petición, evento, consulta, archivo, log y métrica lleva `tenant_id` validado |
| P-04 | Privacidad y seguridad por diseño | Minimización, least privilege, cifrado, conservación y derechos se incorporan al backlog |
| P-05 | Datos propiedad del dominio | Un módulo no modifica tablas de otro; utiliza contrato o evento |
| P-06 | Eventos como hechos | Los eventos son inmutables y describen algo ocurrido; los comandos expresan intención |
| P-07 | Idempotencia por defecto | Pagos, votos, reservas, importaciones y webhooks admiten reintentos seguros |
| P-08 | Evidencia verificable | Acciones críticas generan artefactos con hash, origen, tiempo y política de retención |
| P-09 | Buy commodity, build differentiation | Se compran IAM, pagos, mensajería, streaming y firma; se construyen reglas de negocio |
| P-10 | Observabilidad como requisito | Toda función crítica expone métricas, trazas, logs y señales de negocio correlacionadas |
| P-11 | IA asistida y gobernada | La IA propone o resume; no altera ledger, voto, reglas o documentos firmados |
| P-12 | Evolución reversible | Feature flags, expand/contract, contratos y ADR evitan migraciones big bang |
| P-13 | Confiabilidad proporcional | Resiliencia y capacidad crecen con evidencia de uso, riesgo o contrato |
| P-14 | Configuración sin forks | Los tenants varían mediante reglas, entitlements y plantillas, no mediante ramas de código |
| **P-15** | **Todo principio tiene un control que lo verifica** | Un principio sin prueba automatizada, invariante o gate es una aspiración, no una regla. Cada principio de esta tabla declara su mecanismo de verificación en §13 o §14 |
| **P-16** | **El expediente pertenece al condominio** | Los datos que documentan la vida del condominio deben poder acompañarlo aunque cambie el tenant que lo administra |
| **P-17** | **Ningún compromiso sin capacidad** | No se compromete alcance por fase sin un modelo de capacidad explícito; el recorte de alcance precede a la reducción de calidad |

### 3.5 Restricciones de diseño

- Equipo inicial predominantemente full-stack TypeScript/JavaScript, de 2 a 3 desarrolladores en Fase 1.
- Operación inicial en una región AWS con alta disponibilidad multi-AZ.
- Necesidad de operar con bancos y proveedores que no ofrecen interfaces homogéneas.
- Datos personales, financieros y de gobernanza con requisitos diferenciados de acceso y conservación.
- Usuarios finales con diversidad de dispositivos, conectividad y experiencia digital; **con limitaciones conocidas y documentadas de PWA en iOS** (§5.5).
- Servicios variables de mensajería, video y firma que deben medirse y repercutirse por uso, **con tarifas de terceros que cambian trimestralmente**.
- Reglas legales que deben ser configurables, versionadas y aprobadas por especialistas competentes.
- Presupuesto de infraestructura acotado, con guardrails revisados en §12.9.

---

## 4. Modelo de entrega, fases y gates

### 4.1 Criterio de secuenciación

Las fases se ordenan por **valor económico demostrable y riesgo controlable**, no por superficie funcional. El criterio explícito, en orden:

1. Lo que permite **cobrar** y demostrar el cobro.
2. Lo que permite **explicar en qué se gastó** el dinero cobrado.
3. Lo que se usa **a diario** y genera adopción.
4. Lo que tiene **riesgo jurídico elevado** y baja frecuencia.
5. Lo que depende de **volumen previo** para tener sentido.

Este criterio es el que justifica que Maintenance preceda a Assembly (ADR-019) y el que motiva, en v2.0, adelantar la cobranza avanzada y diferir los add-ons de estacionamiento y control de accesos.

### 4.2 Fases del producto

| Fase | Nombre | Periodo | Alcance principal | Criterio de salida |
|---|---|---|---|---|
| **F1** | Fundación y MVP financiero *(Foundation & MVP)* | Ago–Dic 2026 | Plataforma de entrega, IAM, tenant, personas, onboarding, **ciclo completo de cobranza con aging y escalera de recordatorios**, tickets, comunicados, documentos base, notificaciones y PWA base | Pilotos contratados; aislamiento probado automáticamente, restore verificado, pagos y conciliación básica operando, observabilidad y soporte activos |
| **F1.5** | Consolidación del núcleo | Ene–Mar 2027 | Documentos completos (firma, retención, WORM, legal hold), Integration Hub completo, preferencias y consentimientos, encuestas, recargos y acuerdos, consola interna, design system | Núcleo Core cerrado, deuda técnica de F1 saldada, tenant piloto en operación estable |
| **F2** | Piloto controlado y expansión operativa | Abr–Sep 2027 | **Fondos, presupuesto multi-fondo, egresos y rendición de cuentas**; Reservations Essentials; Front Desk Essentials; Package Plus; traspaso de administración | Uso diario, adopción medida, cadena de custodia y conflictos de reserva controlados, rendición de cuentas publicada por al menos dos condominios |
| **F3** | Disponibilidad general: operaciones de servicio | Oct 2027–Mar 2028 | Maintenance Essentials, activos, planes preventivos, OT, técnicos, proveedores/RFQ, Analytics/BI, Visitor Parking, Access Integration | Operación estable, KPI, renovación y costo unitario sostenible |
| **F4** | Expansión de gobernanza digital | Abr–Ago 2028 | Assembly Essentials, convocatoria, padrón, quorum, voto, acta, firma, streaming y expediente; Compliance rule sets | Ensayos, validación legal por tenant, cero pérdida/duplicación de votos y contingencia probada |
| **F5** | Ecosistema e inteligencia | Desde el cierre de ARG-4 | Marketplace, compliance avanzado, IA gobernada, integraciones comerciales, IoT/SafeTrack y HR limitado | Datos maduros, DPIA, unit economics y demanda pagada |
| **F6** | Escala Enterprise | Según contrato | SSO, bridge/silo, claves dedicadas, API Enterprise, DR avanzado y aplicación nativa si supera el Gate | Contrato y SLA justifican TCO; operación y seguridad demostradas |

**Reglas de fase**

- **F5 no inicia entrega en producción hasta cerrar ARG-4.** Durante F4 puede ejecutarse *discovery* de F5, sin despliegue funcional. Motivo: F4 exige equipo de gobernanza dedicado, guardia SRE y congelamiento de cambios en ventanas de asamblea; solapar ambas fases con el equipo previsto garantiza que ninguna reciba la atención necesaria (P-02, P-17).
- Las fases pueden solaparse en preparación, nunca en entrega de producción de dominios T1.
- Las fechas son **previsión revisable en cada Gate**, no compromiso contractual. El compromiso es el criterio de salida.
- Un servicio no adelanta ni posterga su fase inicial sin RFC, análisis de impacto y actualización de los documentos hijos.

### 4.3 Modelo unificado de gates

Existen dos dictámenes independientes por fase y **ambos son necesarios** para activar comercialmente una capacidad:

- **ARG-n — Architecture Review Gate.** Aprueba el Software Architect con Security y SRE. Responde: *¿es seguro, operable, recuperable y sostenible?*
- **G-n — Product Gate.** Aprueba el Product Owner con Comercial y Customer Success. Responde: *¿entrega valor demostrado y hay disposición a pagar?*

| Fase | Gate técnico | Gate de producto | Evidencia mínima | Regla de bloqueo |
|---|---|---|---|---|
| Previa | **ARG-0** Product & Architecture Baseline | — | Visión, personas, alcance, riesgos, dominios, NFR, clasificación de datos y decisiones aprobadas | Bloquea inicio de F1 |
| F1 | **ARG-1** MVP Design Complete | — | C4, tenancy, threat model, modelo de datos, APIs, CI/CD, backlog normalizado y ADR obligatorios | Bloquea construcción de dominios T1 |
| F1 | **ARG-2** Pilot Readiness | **G2** MVP Readiness | Aislamiento probado automáticamente, backups con restore verificado, observabilidad, soporte, importación, seguridad y carga piloto | ARG-2 bloquea el uso de datos reales de clientes |
| F1.5 | — | — | Cierre de deuda técnica declarada y de hallazgos de ARG-2 | Bloquea inicio de F2 |
| F2 | — | **G3** Pilot Value | Adopción, cobranza medida contra línea base, rendición de cuentas publicada, NPS y disposición a pagar | Bloquea GA |
| F3 | **ARG-3** General Availability Readiness | **G4** GA Readiness + **G5** Professional Readiness | 90 días de datos, SLO, restore test, runbooks, pentest, FinOps y soporte multi-tenant | Bloquea contratación abierta |
| F4 | **ARG-4** Governance Readiness | — + **Gate legal por tenant** | Reglas legales validadas, carga, contingencia, firma, streaming, evidencia y ensayos de asamblea | ARG-4 bloquea F5; el gate legal bloquea la activación por condominio |
| F5 | **ARG-5** Ecosystem & AI Readiness | **G6** Baseline Completion | DPIA, datos maduros, evaluación de IA, proveedores, costos y control humano | DPIA es bloqueante |
| F6 | **ARG-6** Enterprise Scale Readiness | — | TCO, SLA, aislamiento dedicado, DR regional y soporte contractual | Bloquea firma de contrato Enterprise |

**Evidence pack de gate.** Cada gate cierra con un paquete **generado desde el backlog y la plataforma**, no redactado a mano. Contenido obligatorio en §16.7.

### 4.4 Modelo de capacidad (nuevo en v2.0)

Ninguna fase se compromete sin este cálculo explícito y publicado:

```
capacidad_fase = devs_efectivos × sprints_fase × factor_foco
factor_foco = 0.65 en F1 (onboarding, incidentes, hypercare, soporte al piloto)
```

Para F1: 3 devs × 10 sprints × 0.65 ≈ **19,5 dev-sprints efectivos**.

Regla derivada: **una épica debe descomponerse en 3–8 PBIs y completarse en 1–3 sprints con el equipo asignado; si no cumple, se divide antes de entrar al backlog ordenado.** El alcance de una fase se acota a la capacidad calculada; si el alcance excede la capacidad, se recorta el alcance (P-17), nunca la Definition of Done.

### 4.5 Paquetes comerciales

| Paquete | Capacidades |
|---|---|
| **SmartEdify Core** | Portfolio, unidades, personas, roles, onboarding, finanzas de ingreso y egreso, cobranza con aging, rendición de cuentas, comunicaciones, tickets, documentos, notificaciones y dashboard |
| **SmartEdify Operations** | Reservations Essentials, Front Desk Essentials, visitantes, paquetería, incidentes y Maintenance Essentials |
| **SmartEdify Governance** | Assembly Essentials, actas, firma, evidencia, reglas y cumplimiento |
| **SmartEdify Intelligence & Ecosystem** | BI avanzado, IA, proveedores, marketplace, IoT y APIs comerciales |
| **Enterprise** | SSO, aislamiento bridge/silo, claves dedicadas, DR avanzado, soporte y SLA específicos |

### 4.6 Add-ons

| Add-on | Contenido | Unidad comercial | Medición requerida |
|---|---|---|---|
| Amenities Plus | Pagos, depósitos, penalidades, lista de espera, inspecciones y reglas avanzadas | Por condominio y amenidades activas | Amenidades activas |
| Operations Plus | Visitantes recurrentes, contratistas, mudanzas, múltiples porterías y reportes | Por condominio y volumen | Visitas/mes |
| Package Plus | Registro masivo, ubicaciones, lockers, recordatorios y analítica | Por banda de paquetes | Paquetes/mes |
| Visitor Parking | Espacios, permisos, placas, límites, pago y penalidades | Por condominio | Espacios activos |
| Access Integration | Gateway, credenciales, lectura de eventos y dispositivos aprobados | Implementación + suscripción | Dispositivos activos |
| WhatsApp Usage | Mensajes transaccionales y recordatorios | **Por mensaje y categoría de plantilla** | Mensajes por categoría |
| Assembly Live | Streaming, grabación, moderación y soporte de evento | Por evento, duración y participantes | Minutos-participante |
| Enterprise Reliability | Warm standby, RPO/RTO mejorados y operación dedicada | Contrato y TCO específicos | Recursos dedicados |

> **Regla nueva (v2.0):** ningún add-on con unidad comercial variable puede activarse comercialmente antes de que exista la medición correspondiente en `SVC-CORE-05 Subscription & Metering` (§5.15). Vender por consumo sin medir el consumo produce márgenes desconocidos.

### 4.7 Segmentación de expansión operativa

| Segmento | Perfil | Configuración recomendada |
|---|---|---|
| S1 — Autogestionado | Pocas unidades, sin portería permanente, baja complejidad | Core + Reservations Lite cuando exista amenidad |
| S2 — Portería parcial | Control manual de visitas y paquetes, una o varias amenidades | Core + Reservations Essentials + Front Desk Essentials |
| S3 — Portería 24/7 | Alta densidad, turnos, entregas y trazabilidad exigente | Operations + Package/Operations Plus según volumen |
| S4 — Comunidad cerrada | Acceso vehicular, garita y estacionamientos limitados | Front Desk + Visitor Parking + Access Integration opcional |
| S5 — Mixto/comercial | Visitas corporativas, proveedores y horarios diferenciados | Operations Plus y vínculo futuro con Maintenance |

### 4.8 Entitlements y configuración

```
Tenant
 └─ Portfolio
     └─ Property / Condominio        (identidad global estable)
         └─ Feature entitlement
             ├─ feature_code
             ├─ plan_code
             ├─ status / effective dates
             ├─ usage_limit
             ├─ metering_key          ← nuevo en v2.0
             └─ billing_reference
```

- El backend valida el entitlement; ocultar una función en frontend **no** constituye autorización.
- Feature flag ≠ entitlement ≠ rol. El flag controla despliegue técnico; el entitlement controla derecho comercial; el rol controla autorización. Los tres se evalúan por separado y ninguno sustituye a otro.
- La activación y facturación de módulos operativos se realiza por propiedad, aunque el contrato sea del tenant.
- La desactivación no elimina datos; aplica modo lectura y política contractual de conservación.
- No se permiten forks de código por cliente; las variaciones se resuelven con configuración versionada.
- **Todo entitlement con `usage_limit` debe declarar su `metering_key`**, que enlaza con la medición de consumo real.

---

## 5. Arquitectura funcional, dominios y canales

### 5.1 Catálogo de bounded contexts

| ID | Contexto | Responsabilidad | Fase | Datos autoritativos |
|---|---|---|---|---|
| D01 | Identity & Access | Autenticación, MFA, sesiones, federation y service accounts | F1 | Identidad técnica y sesión |
| D02 | Tenant & Portfolio | Administradoras, propiedades, unidades, alícuotas, planes y entitlements | F1 | Tenant, Property, Unit, Entitlement |
| D03 | People & Relationships | Personas, propiedad, ocupación, representación, vehículos y consentimientos | F1 | Person, Occupancy, Representation |
| **D04** | **Finance, Collections & Expenses** | Cargos, pagos, ledger, aplicación, conciliación, **aging y cobranza**, **fondos, presupuesto, egresos y rendición de cuentas** | F1 / F2 | Account, Charge, Payment, LedgerEntry, Fund, Expense, Statement |
| D05 | Communications | Comunicados, audiencias, acuses, encuestas y moderación | F1 | Notice, Audience, Acknowledgement |
| D06 | Ticketing & SLA | Solicitudes, comentarios, prioridades, responsables, SLA y cierre | F1 | Ticket, Comment, SLA |
| D07 | Documents & Evidence | Expediente, plantillas, PDF, firma, hash, retención, WORM y legal hold | F1 / F1.5 | Document, Version, Signature, Evidence |
| D08 | Notifications | Plantillas de canal, routing, preferencias, reintentos y delivery status | F1 | Template, Delivery, Preference |
| D09 | Reservations | Amenidades, reglas, holds, aprobación, check-in, depósitos y penalidades | F2 | Amenity, Reservation, Hold |
| D10 | Front Desk & Operational Control | Visitantes, QR, paquetes, bitácora, incidentes y turnos | F2 | Visit, Pass, Package, LogEntry |
| D11 | Asset & Maintenance | Activos, planes preventivos, OT, checklists, recursos, costos y SLA | F3 | Asset, Plan, WorkOrder |
| D12 | Governance / Assembly | Propuestas, convocatorias, padrón, quorum, voto, resoluciones, actas e impugnaciones | F4 | Assembly, Vote, Resolution |
| D13 | Compliance | Rule sets, obligaciones, consentimientos, validaciones y decisiones versionadas | F4 / F5 | RuleSet, Obligation, Decision |
| D14 | Providers & Procurement | Proveedores, homologación, RFQ, cotizaciones, adjudicación y desempeño | F3 / F5 | Provider, RFQ, Quote |
| D15 | Marketplace | Catálogo, orden, comisión, disputa y reputación | F5 | Listing, Transaction, Commission |
| D16 | Payroll & HR | Maestros laborales, documentos, SST y, cuando se apruebe, nómina | F5 | Employee, PayrollRun, Policy |
| D17 | Analytics & AI | Read models, KPI, predicción, RAG y registro de model runs | F3 / F5 | Metric, Feature, ModelRun |
| D18 | Integration Hub | Adaptadores, webhooks, archivos, mappings, sync jobs, DLQ y replay | F1+ | Connector, Mapping, SyncJob |
| D19 | Audit & Platform Governance | Auditoría, eventos de seguridad, configuración global y controles internos | F1 | AuditEvent, SecurityEvent, PlatformPolicy |
| **D20** | **Onboarding & Migration** *(nuevo)* | Discovery, plantillas, staging transversal, saldos de apertura, acta de carga, hypercare y **offboarding** | F1 | ImportBatch, LoadCertificate, OnboardingCase |
| **D21** | **Subscription & Metering** *(nuevo)* | Contrato, plan, precio, medición de consumo por unidad comercial, cuotas, facturación y comprobante | F1 / F2 | Subscription, UsageRecord, Invoice |

**Capacidad transversal no modelada como bounded context:** *Platform Runtime & Delivery* (§5.14) es una capacidad de plataforma, no un dominio de negocio; no posee datos autoritativos de negocio y por eso no recibe código `Dxx`, pero sí tiene servicio, dueño, backlog y criterios de salida propios.

### 5.2 Reglas de ownership

- Cada bounded context posee su modelo, schema lógico, repositorios, eventos y API interna.
- Ningún módulo escribe directamente tablas de otro dominio; utiliza un puerto o evento. **Esta regla se verifica automáticamente en CI** (§8.7).
- Los read models pueden combinar datos para consulta, pero no son autoritativos para decisiones críticas.
- Los cambios que cruzan dominios usan outbox, consumidores idempotentes y compensación cuando corresponda.
- Las claves externas de proveedores se encapsulan en Integration Hub y nunca se convierten en la identidad primaria del negocio.
- Los procesos batch deben ser reanudables, medir progreso y limitarse por tenant para evitar *noisy neighbors*.
- **Un contexto que crece más allá de lo que un dueño puede gobernar se divide antes de extraerse**: primero se separa el módulo, luego —si se cumplen los criterios de §8.8— se extrae el servicio.

### 5.3 Modelo de tenancy e identidad global de propiedad

> **Modelo predeterminado.** La empresa administradora es el **tenant contractual**. Los condominios se representan como propiedades subordinadas y el portfolio agrupa la cartera. El modelo puede evolucionar a *bridge* o *silo* para Enterprise sin cambiar el dominio.

**Cambio material en v2.0.** El modelo anterior ataba implícitamente la existencia del condominio al tenant que lo administra. Dado que en el mercado objetivo la junta de propietarios **cambia de administradora con frecuencia**, esto convertía cada renovación en un riesgo de pérdida de historial para el condominio y de pérdida de cliente para la plataforma. Se introduce por tanto:

| Concepto | Definición | Regla |
|---|---|---|
| `property_global_id` | Identificador estable, único y **no reasignable** de un condominio, independiente del tenant | Se genera una sola vez en el alta y nunca cambia, aunque la propiedad cambie de tenant |
| `property_tenant_link` | Vínculo vigente entre una propiedad y el tenant que la administra, con fecha de inicio, fin, contrato y motivo | Una propiedad tiene exactamente un vínculo activo; el historial de vínculos es inmutable |
| `custodian` | Rol que declara quién es el titular del expediente del condominio (junta de propietarios por defecto) | Determina quién autoriza el traspaso y quién ejerce derechos sobre los datos |

Consecuencias de diseño obligatorias:

- Toda entidad del expediente del condominio (ledger, actas, documentos, OT, evidencia) referencia `property_global_id` además de `tenant_id`. El `tenant_id` sigue siendo el eje de aislamiento en RLS; el `property_global_id` es el eje de continuidad.
- El traspaso de administración **no es una reimportación**: es un cambio de vínculo con acta, doble autorización y preservación del histórico en modo lectura (§6.9).
- El contrato marco debe declarar explícitamente la titularidad de los datos del condominio y su destino al término. Esto se conecta con la cadena de responsable/encargado de §11.6.

Reglas generales de tenancy que se mantienen:

- Una identidad puede pertenecer a múltiples tenants y asumir roles diferentes en cada uno.
- Toda operación selecciona un tenant activo y, cuando corresponda, una propiedad activa.
- Los usuarios internos de SmartEdify utilizan un espacio de administración separado del B2B2C.
- Los clientes Enterprise pueden utilizar base o claves dedicadas cuando el contrato justifique el TCO.

### 5.4 Personas y canales

| Persona | Canales | Necesidades críticas |
|---|---|---|
| Administrador de cartera | Web administrativa y APIs | Vista multi-condominio, bulk actions, cobranza, conciliación, egresos, SLA, auditoría y reportes |
| Junta directiva | Web/PWA y firma | Aprobaciones, presupuesto, **rendición de cuentas**, documentos, asambleas y evidencia |
| Propietario/residente | PWA mobile-first, web, email, push y WhatsApp opcional | **Estado de cuenta y pago autoservicio**, transparencia de gastos, reservas, tickets, visitas, documentos y voto |
| Portería/concierge | PWA tablet/escritorio | Visitantes, QR, paquetes, bitácora, incidentes y operación rápida |
| Técnico/proveedor | PWA móvil y portal | OT, checklists, fotos, firma, cotizaciones, SLA y operación offline controlada |
| Auditor/legal | Portal de lectura y exportables | Evidencia íntegra, historial, contratos, actas y logs |
| Soporte SmartEdify | Consola interna separada | Diagnóstico, impersonation controlada, auditoría, tenant health y soporte |

### 5.5 Estrategia PWA-first y limitaciones conocidas

Las experiencias móviles se entregan inicialmente como Progressive Web Apps. La PWA soporta instalación, service worker, IndexedDB, cola offline, cámara, QR, notificaciones y telemetría.

**Limitaciones documentadas que condicionan el diseño (nuevo en v2.0).** No son sorpresas a descubrir en el piloto; son restricciones de entrada:

| Limitación | Efecto | Mitigación obligatoria |
|---|---|---|
| En iOS, las notificaciones push requieren que la PWA esté **instalada en la pantalla de inicio** | Una fracción relevante de residentes con iPhone nunca recibirá push | El *fallback* a email —y a WhatsApp cuando esté contratado— es **requisito funcional**, no preferencia. Ninguna comunicación crítica depende exclusivamente de push |
| *Background sync* no disponible en Safari | La cola offline de técnico y portería no se vacía sin la app en primer plano | Sincronización explícita al abrir, indicador visible de pendientes, y diseño que tolera latencia de sincronización |
| Evicción de almacenamiento local en navegadores móviles para sitios no instalados | La cola offline puede desaparecer | Todo comando offline es idempotente y **reintentable desde el servidor**; se muestra estado de confirmación y no se asume persistencia local |
| Sin NFC ni periféricos Bluetooth | Limita kiosco, lectores y control de acceso físico | Access Integration opera vía gateway local, no vía dispositivo del usuario |

**Matriz de operación offline**

| Operación | Offline | Regla |
|---|---|---|
| Consultar OT descargadas / completar checklist | Permitido | Copia local, ID temporal, cola idempotente y sincronización |
| Crear ticket o registrar paquete | Permitido | Confirmación local pendiente hasta aceptar el backend |
| Check-in de visitante | Limitado | Lista precargada y procedimiento de contingencia |
| Crear reserva | No autoritativo | Puede prepararse la solicitud; el backend confirma concurrencia |
| Pago y conciliación | No | Requiere proveedor y backend autoritativo |
| Voto y quorum | No | La confirmación debe persistirse y validarse en línea |
| Firma crítica y cambio de permisos | No | Requiere autenticación reforzada y servicios autoritativos |

### 5.6 Gate de aplicación nativa

La aplicación nativa se considera después de al menos 90 días de telemetría productiva, con demanda pagada, capacidad organizacional y limitaciones reales de PWA demostradas.

| Condición | Umbral |
|---|---|
| Pilotos o patrocinio | Tres clientes pagados o un contrato Enterprise que financie la capacidad |
| Uso móvil | Al menos 60 % de sesiones de usuarios finales y 1,500 MAU o equivalente contractual |
| Limitaciones PWA | Dos flujos críticos afectados. **La ausencia de push en iOS sin instalación cuenta como una de ellas si se demuestra con telemetría de tasa de instalación** |
| Madurez | APIs, design system, autenticación, observabilidad y soporte estabilizados |
| Economía | Beneficio/costo ≥1.5 y recuperación ≤12 meses |
| **Paso intermedio evaluable** | **Empaquetado del PWA (tipo Capacitor) para presencia en tiendas y push nativo, como opción reversible previa al desarrollo nativo completo** |
| Stack futuro | React Native + Expo + TypeScript; una aplicación con experiencias por rol |

### 5.7 Identity & Access (D01)

Identity & Access autentica identidades, administra sesiones y emite un nivel de aseguramiento, pero **no decide** derecho a voto, elegibilidad financiera, relación con unidades ni permisos del negocio. Amazon Cognito es el proveedor inicial; SmartEdify conserva memberships, roles y atributos de autorización.

| Responsabilidades | Integraciones |
|---|---|
| OIDC/OAuth2, MFA, recuperación segura, passkeys | Tenant para membresía y contexto |
| Sesiones, dispositivos, revocación, step-up y service accounts | People para perfil y relaciones |
| Claims mínimos: subject, tenant, scopes, assurance level | Audit para autenticación y privilegios |
| Federación SAML/OIDC para Enterprise | Notifications para recuperación y alertas |

**Refuerzos en v2.0:** passkeys/WebAuthn se promueven a F1.5 para perfiles privilegiados (administradores y juntas), porque el vector de ataque más probable contra una organización que mueve fondos de terceros es el *phishing* de credenciales privilegiadas, y TOTP no lo neutraliza. Ver §10.3 para la obligación de ensayo de portabilidad.

### 5.8 Tenant, Portfolio y People (D02, D03)

Tenant & Portfolio es la fuente maestra de la estructura multi-condominio. People representa personas y relaciones temporales con unidades; separa la identidad técnica de la persona de negocio y conserva vigencias, poderes, ocupaciones y autorizaciones.

- Provisioning y desprovisioning de tenant y propiedades, **idempotente**.
- Configuración regional, moneda, zona horaria, plan, features y límites.
- Jerarquía `tenant → portfolio → property → building/tower → unit`, con `property_global_id` estable (§5.3).
- Alícuotas con vigencia, precisión decimal fijada e **invariante de suma** (§9.6).
- Propietarios, residentes, inquilinos, custodios, representantes y vehículos.
- Deduplicación, staging, acta de carga y control de calidad de datos.
- Historial efectivo desde/hasta; las relaciones no se sobrescriben sin trazabilidad.

### 5.9 Finance, Collections & Expenses (D04)

Finance mantiene un **subledger operativo de partida doble** balanceado por condominio, fondo y unidad. No sustituye al ERP corporativo. Cada cargo, pago, gasto, ajuste, reversión y conciliación produce entradas inmutables o movimientos compensatorios, con referencia a la regla, la fuente y la evidencia.

**Ingreso**

| Capacidad | Regla | Fase |
|---|---|---|
| Cargos | Ordinarios, extraordinarios, recurrentes y prorrateados; versión y aprobación trazables | F1 |
| Pagos | Orden interna independiente del proveedor; idempotencia y estados explícitos | F1 |
| Ledger | Partidas balanceadas; ningún asiento confirmado se edita o elimina | F1 |
| Aplicación | Pago exacto, parcial, varias deudas, sobrepago y tercero según política versionada | F1 |
| Conciliación | Separar aplicación a deuda de liquidación del proveedor y verificación bancaria | F1 |
| **Aging y cobranza** | **Aging por unidad/propiedad/portfolio, escalera de recordatorios por tramo, suspensión automática al pagar, evidencia de cada comunicación** | **F1** |
| Estado de cuenta y autoservicio | Consulta, descarga, pago y comprobante para el propietario/residente | F1 |
| Recargos e intereses | Deterministas, versionados, con simulación previa | F1.5 |
| Acuerdos y excepciones | Convenios de pago, cuotas, seguimiento y ruptura | F1.5 |

**Egreso y transparencia (nuevo en v2.0)**

| Capacidad | Regla | Fase |
|---|---|---|
| Fondos | Fondo ordinario, fondo de reserva y fondos extraordinarios como cuentas separadas del ledger; ningún movimiento cruza fondos sin asiento explícito y autorizado | F2 |
| Presupuesto multi-fondo | Plan por fondo y partida, aprobación de la junta, compromisos y comparación plan-real | F2 |
| Egresos | Registro de gasto, categoría, fondo, proveedor, documento de respaldo, aprobación y pago | F2 |
| **Rendición de cuentas** | **Cierre mensual, estado de gastos comunes publicable, evidencia, versión y acceso del propietario** | **F2** |
| Integración contable | Exportaciones versionadas con checksum y bitácora | F3 |

**Límite explícito.** Finance no ejecuta pagos a proveedores ni sustituye la tesorería de la administradora: registra la obligación, su aprobación, su documento de respaldo y su reflejo contable. La transferencia bancaria de salida permanece fuera de alcance mientras SmartEdify no custodie fondos.

### 5.10 Communications, Ticketing y Notifications (D05, D06, D08)

Communications administra contenido, audiencia y evidencia; Ticketing administra trabajo, responsabilidad y SLA; Notifications decide el canal y registra entrega. Esta separación evita que la lógica de negocio quede acoplada a email, push o WhatsApp.

| Contexto | Responsabilidades |
|---|---|
| Communications | Mural segmentado, versiones, programación, acuses, métricas de lectura, encuestas y moderación |
| Ticketing | Categoría, prioridad, estado, responsable, SLA, comentarios, adjuntos, escalamiento, encuesta y reapertura |
| Notifications | Plantillas, idioma, preferencias, consentimiento, routing, reintentos, fallback, suppression, **categoría de plantilla del proveedor** y costo por uso |

### 5.11 Documents & Evidence (D07)

Documents proporciona expediente digital, generación, versionado, firma, hash, retención y verificación. Los borradores mantienen versionado ordinario; solo la copia final autoritativa ingresa a WORM cuando su clase lo exige.

- Metadatos, clasificación, propietario de dominio y versión.
- Plantillas y generación PDF sin perder el documento fuente cuando sea necesario.
- Firma electrónica/digital y certificado de evidencias.
- Hash, QR o endpoint de verificación, sello de tiempo y cadena de confianza.
- Retention rule, disposition date, legal hold y certificado de eliminación.
- Control de lectura, exportación y descarga de información sensible.
- Lifecycle a almacenamiento de menor costo conforme a política.

### 5.12 Reservations, Front Desk, Maintenance, Governance y demás dominios

| Dominio | Alcance y límite |
|---|---|
| Reservations (D09) | Disponibilidad y reglas de amenidades. **Concurrencia garantizada por restricción de exclusión en base de datos** (§9.4), no por locks distribuidos |
| Front Desk (D10) | Portería y seguridad operativa sin convertirse en el sistema físico de control de acceso |
| Asset & Maintenance (D11) | Convierte tickets y planes preventivos en órdenes de trabajo trazables, ejecutadas y verificadas. Excluye inventario valorizado, BIM, gemelo digital, IoT predictivo y compras completas |
| Governance / Assembly (D12) | Máquina de estados explícita con event sourcing selectivo. **Voto verificable y quorum reproducible** (§9.7). Requiere gate legal por tenant (§11.7) |
| Compliance (D13) | Reglas deterministas versionadas, *effective dating*, simulación y explicación. La IA no es autoridad legal |
| Providers & Procurement (D14) | Onboarding, documentación, RFQ, comparación, adjudicación, orden y evaluación; marketplace solo después de volumen |
| Analytics (D17) | KPI por tenant/portfolio, read models y snapshots; no modifica operaciones autoritativas |
| IA (D17) | Clasifica, resume, redacta borradores y responde con RAG autorizado; requiere registro y revisión humana |
| Payroll & HR (D16) | Inicialmente maestro, documentos, vencimientos y exportación; nómina completa solo con matriz laboral especializada |
| IoT/SafeTrack (D17/D18) | Hub de eventos, alertas y evidencias; video continuo permanece preferentemente en proveedor especializado |

### 5.13 Onboarding & Migration (D20) — nuevo

**Justificación.** El riesgo con mayor probabilidad del registro (R-08, datos iniciales deficientes) no tenía dueño: la importación estaba repartida entre estructura inmobiliaria, personas y el hub de integración, y nadie era responsable del proceso completo, del acta de carga consolidada, de los saldos de apertura ni del hypercare. Un onboarding fallido no es un defecto: es la pérdida del cliente en el primer mes.

| Capacidad | Regla |
|---|---|
| Discovery y plan de migración | Inventario de propiedades, usuarios, bancos, procesos, datos y módulos; plan con responsables y fechas |
| Motor de importación transversal | Staging obligatorio, mapping versionado, validación estructural y de negocio, preview con totales, publicación e idempotencia por lote y fila |
| Saldos de apertura | Carga conciliada de deuda y de fondos, con asiento de apertura balanceado y evidencia del origen |
| Acta de carga | Totales, checksum, incidencias aceptadas, responsable y firma; documento formal en el expediente |
| Go-live y hypercare | Feature flags, canales, soporte reforzado, seguimiento diario/semanal y cierre formal con criterios acordados |
| **Offboarding** | Exportación completa, certificación de eliminación y continuidad (§6.10) |

Controles no negociables:

- Ningún archivo escribe directamente en datos autoritativos.
- La repetición del lote no duplica unidades, personas, cargos ni saldos.
- El usuario visualiza totales, errores y cambios antes de publicar.
- El lote puede revertirse antes del cierre o mediante movimientos compensatorios.
- Se conservan original, hash, mapping, versión del importador, resultados y acta.

### 5.14 Platform Runtime & Delivery — nuevo

**Justificación.** ARG-2 exige aislamiento, backups, observabilidad, soporte, importación, seguridad y carga piloto. Ese trabajo existía como requisito pero no como alcance planificado, de modo que consumía capacidad de la Fase 1 sin aparecer en el backlog, sin estimarse y sin poder priorizarse frente a lo funcional. Se convierte en capacidad de primera clase con salidas verificables.

| Bloque | Salida verificable |
|---|---|
| Infraestructura como código y topología de cuentas | Ambientes reproducibles desde cero; estado cifrado; *policy-as-code* activo (§8.4) |
| Pipeline CI/CD | Gates de calidad bloqueantes, SBOM, firma y escaneo de imagen, migraciones separadas del arranque |
| Observabilidad | Trazas, métricas y logs correlacionados con `tenant_id`; SLO declarado como código; alertas por *burn rate* |
| Backups y recuperación | Restore ejecutado y **verificado** (arranca la aplicación, cuadra el ledger, valida hashes), no solo job completado |
| Línea base de seguridad | Secretos gestionados, SAST/DAST/secret-scan, threat model vigente y **prueba negativa cross-tenant generada** |

### 5.15 Subscription & Metering (D21) — nuevo

**Justificación.** Los entitlements declaraban `usage_limit` y `billing_reference`, pero ningún componente medía el consumo real ni emitía la factura. Los add-ons con unidad comercial variable —streaming por minuto-participante, WhatsApp por mensaje y categoría, firma por acto, IA por uso— resultaban imposibles de facturar y, sobre todo, imposibles de costear.

| Capacidad | Regla | Fase |
|---|---|---|
| Contrato y plan | Plan, precio, moneda, ciclo, vigencia y referencias documentales del tenant | F1 |
| Medición de consumo | `UsageRecord` inmutable por `metering_key`, tenant, propiedad y periodo; agregación idempotente; conciliación contra el consumo reportado por el proveedor | F1 |
| Cuotas y límites | Aplicación de `usage_limit`, alerta por consumo anómalo y bloqueo o cobro por exceso según contrato | F2 |
| Facturación y comprobante | Emisión periódica, cobro y **comprobante electrónico conforme a la normativa tributaria peruana** (§10.10) | F2 |

**Regla de margen.** Ningún servicio con costo variable de proveedor puede activarse comercialmente sin que su `metering_key` esté implementado y conciliado contra la facturación del proveedor. El margen desconocido es una decisión, no un descuido.

---

## 6. Flujos críticos de negocio

### 6.1 Onboarding de tenant

1. Crear tenant, portfolio y propiedades; asignar `property_global_id`; configurar región, moneda, plan, responsables y features.
2. Importar condominios, torres, unidades, alícuotas, personas, relaciones y saldos mediante staging.
3. Validar estructura, balance, duplicados, vigencias, consentimientos, **invariante de alícuotas** y relaciones incompletas.
4. Configurar roles, reglas, plantillas, canales, bancos, pasarelas y proveedores.
5. Realizar simulación, conciliación inicial de saldos de apertura y revisión de excepciones.
6. Emitir acta de carga con totales, checksum, incidencias aceptadas y responsable, firmada y archivada en el expediente.
7. Activar por feature flags, monitorear adopción y ejecutar hypercare hasta cumplir criterios de cierre.

### 6.2 De la cuota a la conciliación

1. Crear y aprobar conceptos, reglas y cargos ordinarios o extraordinarios, imputados al fondo correspondiente.
2. Emitir estado de cuenta y referencia estructurada por deuda.
3. Generar orden de pago y redirigir al checkout alojado o código de recaudación.
4. Recibir webhook firmado, validar idempotencia y **consultar el recurso autoritativo del proveedor**.
5. Aplicar el pago a la deuda cuando exista una coincidencia válida.
6. Recibir reporte de liquidación y separar importe bruto, comisión, devolución o contracargo.
7. Importar movimiento bancario y conciliar el lote neto o depósito directo.
8. Resolver excepciones con segregación maker-checker y cerrar el periodo con hash del cierre.

> **Regla financiera.** Un webhook aprobado no demuestra por sí solo que el dinero ingresó al banco. SmartEdify separa el **estado del pago**, la **aplicación a la deuda**, la **liquidación del proveedor** y la **conciliación bancaria**. Ninguna de las cuatro sustituye a otra.

**Matching y excepciones**

| Regla | Condición | Resultado |
|---|---|---|
| R1 — ID externo | Proveedor, cuenta, `transaction_id`, moneda y estado coinciden | Automático, confianza 100 |
| R2 — Código de recaudación | Código válido, tenant, moneda e importe compatibles | Automático, confianza 95-100 |
| R3 — Referencia SmartEdify | Referencia estructurada, deuda activa e importe válido | Automático si ≥95 |
| R4 — Cuenta origen + importe | Cuenta registrada, identificación y una sola deuda candidata | Propuesta, confianza 90 |
| R5 — Unidad + importe + fecha | Una sola deuda compatible dentro de ventana | Revisión simplificada, 80-89 |
| R6 — Nombre/glosa aproximada | Texto libre o nombre del ordenante | Solo sugerencia, máximo 74 |

Solo una coincidencia ≥95 sin conflictos se publica automáticamente. Moneda diferente, duplicidad, tenant distinto, dos candidatos, reversión, fecha fuera de periodo o cierre contable bloquean la automatización.

### 6.3 Cobranza proactiva y autoservicio del residente (nuevo en v2.0)

**Cobranza (administradora)**

1. Al cierre de cada corte, el motor calcula *aging* por unidad, propiedad y portfolio con tramos configurables por tenant.
2. La escalera de cobranza dispara comunicaciones por tramo, canal y plantilla versionada, mediante Notification Hub.
3. Cada comunicación queda vinculada a la deuda concreta, con evidencia de entrega y costo.
4. El registro de un pago o de un acuerdo **suspende automáticamente** la escalera.
5. La cartera de morosidad expone antigüedad, monto, gestión realizada y próximo paso por unidad.

Invariantes: cero recordatorios a unidades sin deuda; cero comunicaciones que expongan deuda detallada por canal externo (§10.5).

**Autoservicio (residente)**

1. El residente consulta su estado de cuenta con detalle por concepto, fondo y periodo.
2. Paga en línea con referencia estructurada, o descarga la referencia para pago por otro canal.
3. Recibe confirmación y comprobante, con estado explícito: *aprobado por el proveedor* vs *aplicado a la deuda*.
4. Consulta el histórico y accede a los documentos de respaldo publicados.

### 6.4 Rendición de cuentas mensual (nuevo en v2.0)

1. Registro de egresos del periodo con categoría, fondo, proveedor, documento de respaldo y aprobación.
2. Cierre del periodo: bloqueo de posting no autorizado y cálculo del estado por fondo.
3. Generación del estado de gastos comunes y del comparativo presupuesto-ejecución.
4. Revisión y aprobación por la junta, con evidencia de la aprobación.
5. Publicación a los propietarios con versión, fecha y control de lectura.
6. Archivo en el expediente con hash y política de retención.

La reapertura de un periodo cerrado requiere maker-checker, motivo y auditoría, y genera una nueva versión del estado publicado; nunca sobrescribe la anterior.

### 6.5 Ticket a resolución

1. El usuario crea un ticket con categoría, prioridad inicial, descripción y evidencia.
2. El sistema asigna SLA, responsable y reglas de escalamiento.
3. El administrador clasifica, responde o convierte el ticket en orden de trabajo.
4. El técnico ejecuta, registra checklist, fotos, materiales y observaciones.
5. El responsable valida conformidad y costo; el residente recibe actualización.
6. El ticket se cierra, puede ser calificado y alimenta indicadores de reincidencia y desempeño.

### 6.6 Comunicación trazable

- Selección de audiencia por tenant, propiedad, torre, unidad, rol o atributo.
- Plantilla, versión, idioma, fecha de vigencia y responsable.
- Programación y envío mediante Notification Hub.
- Registro de canal, proveedor, estado de entrega, reintentos y costo, **con categoría de plantilla del proveedor**.
- Acuse o lectura cuando sea aplicable; el push no se considera evidencia legal por sí solo.
- Conservación conforme a clase documental y minimización del contenido enviado a canales externos.

### 6.7 Reservas, Front Desk y Maintenance

| Flujo | Pasos principales |
|---|---|
| Reserva | Consulta disponibilidad → *hold* con restricción de exclusión → validación de reglas → aprobación/cobro cuando aplique → confirmación → check-in → cierre |
| Visitante | Preautorización → token temporal → validación → check-in → aviso → check-out → expiración y conservación |
| Paquete | Recepción → identificación de unidad → ubicación → notificación → recordatorios → entrega → evidencia y cierre |
| Incidente | Registro → prioridad → evidencia → escalamiento a ticket → seguimiento → cierre y bitácora de turno |
| Orden de trabajo | Ticket o plan → evaluación → OT → asignación → ejecución y evidencia → conformidad → cierre y KPI |

Estados de OT: `Draft → Ready → Assigned → In progress → (Blocked) → Completed → Accepted → Closed`, con `Reopened` que exige motivo y conserva historial completo.

### 6.8 Assembly Essentials

`Preparación → Convocatoria → Padrón y poderes → Asistencia y quorum → Discusión y voto → Resolución → Acta, firma y expediente`

- La convocatoria conserva plantilla, versión, publicación, canales y evidencia de envío.
- **El padrón es un snapshot firmado**; los cambios posteriores no alteran silenciosamente el evento.
- La asistencia registra ingreso, salida, representación y efecto en quorum.
- `CastVote` incluye `assembly_id`, `agenda_item_id`, `voter_subject`, `representation_id`, `choice`, `nonce`, `idempotency_key`, sesión y timestamp del servidor.
- La unicidad se controla por votante representado y punto; cualquier sustitución debe estar permitida y conservar historial.
- **Verificabilidad del voto (nuevo en v2.0):** al aceptar un voto, el sistema devuelve un identificador y el hash del registro. Los votos de cada punto de agenda se encadenan por hash y **la raíz de la cadena se publica en el acta**, de modo que cualquier votante puede verificar la inclusión de su voto en el cómputo sin revelar su sentido. Voto secreto, impugnaciones y criptografía avanzada permanecen en *Assembly Advanced*.
- **Quorum reproducible (nuevo en v2.0):** el quorum es una función pura y determinista de `(padrón_snapshot, eventos_de_asistencia, ruleset_version)`, recomputable a posteriori. La versión de la función y del rule set se almacena en el acta.
- El acta final incluye resoluciones, resultados, evidencia, firma, hash, raíz de verificación y almacenamiento WORM.
- SmartEdify facilita exportación y formalización; **no declara** que la firma digital sustituya automáticamente libro, notaría o registro.
- **Gate legal por tenant (nuevo en v2.0):** el módulo no se activa para un condominio hasta que exista una revisión documentada de compatibilidad entre el flujo digital y su reglamento interno, firmada por el especialista legal, junto con una vía de contingencia presencial documentada (§11.7).

El derecho a voto se calcula sobre el snapshot firmado de personas, representaciones, unidades, alícuotas, reglas y condición aplicable. Los cálculos usan decimal exacto y redondeo explícito; nunca punto flotante binario (§9.6).

### 6.9 Traspaso de administración (nuevo en v2.0)

Flujo por el cual un condominio cambia de empresa administradora conservando su expediente.

1. **Solicitud**: la junta de propietarios (custodio) o la administradora saliente inicia el traspaso, indicando el tenant destino si existe.
2. **Doble autorización**: se requiere autorización del custodio del condominio **y** constancia de término de la relación con el tenant origen. Ninguna de las dos partes puede ejecutar el traspaso por sí sola.
3. **Corte contable**: cierre del periodo en el tenant origen, conciliación de saldos y generación del estado de traspaso por fondo y unidad.
4. **Paquete de traspaso**: exportación completa y verificable del expediente —ledger, actas, documentos, OT, evidencia y padrón— con hashes y manifiesto.
5. **Ejecución**:
   - *Destino dentro de SmartEdify*: se cierra el `property_tenant_link` vigente y se abre uno nuevo. El histórico permanece asociado al `property_global_id` y queda accesible en modo lectura para el tenant destino, con las restricciones de acceso que el custodio determine.
   - *Destino fuera de SmartEdify*: se entrega el paquete exportado y se ejecuta el offboarding de §6.10.
6. **Acta de traspaso** firmada, con inventario de lo transferido, y archivo en el expediente bajo retención permanente.

Reglas: el tenant origen conserva acceso de lectura únicamente a lo que la ley o el contrato le obliguen a conservar; los datos personales sin finalidad subsistente se anonimizan; el legal hold vigente suspende cualquier eliminación asociada.

### 6.10 Offboarding de tenant (nuevo en v2.0)

Aplica al término del contrato, sea cual sea la causa. No es una capacidad Enterprise: es una obligación contractual y de protección de datos desde el primer cliente.

1. Notificación y fijación de la fecha efectiva de término.
2. Paso a modo lectura y suspensión de operaciones de escritura, conservando consulta.
3. **Exportación completa** en formatos abiertos y documentados, con manifiesto y hashes verificables.
4. Ventana de recuperación acordada contractualmente.
5. Eliminación o anonimización conforme a la matriz de retención, respetando legal holds vigentes.
6. **Certificado de disposición** con alcance, regla aplicada, fecha, responsable y resultado.
7. Registro de todo el proceso en auditoría.

---

## 7. Fronteras de confianza y contexto externo

### 7.1 Sistemas externos y patrones

| Sistema | Patrón | Controles principales |
|---|---|---|
| IAM | OIDC/OAuth2/PKCE | Tokens breves, MFA, step-up, revocación y claims mínimos |
| Pasarelas y bancos | API, webhook firmado, archivos y SFTP | Idempotencia, firma, *replay protection*, staging y conciliación |
| Mensajería | API/evento hacia Notification Hub | Plantillas, consentimientos, suppression, cuotas, categoría de plantilla y delivery status |
| Streaming | Token temporal y webhooks | El proveedor no conoce reglas de voto; grabación al expediente |
| Firma | API y validación de certificado | Hash, consentimiento, evidencia, ROPS y portabilidad |
| ERP | REST/CSV/SFTP | Modelo canónico, mappings versionados y checksum |
| IoT/Access | Gateway local o webhook | Credenciales por dispositivo, segmentación y store-and-forward |
| Servicios públicos | API o exportación controlada | Adaptadores anticorrupción y versionado de formato |

### 7.2 Fronteras

Las fronteras se ubican entre dispositivo y edge, edge y BFF, BFF y dominio, dominio y datos, y plataforma y proveedor. **La red privada no confiere confianza**: cada llamada se autentica, autoriza, valida, limita y registra conforme al recurso y al tenant.

- Ningún proveedor externo recibe acceso directo a la base transaccional.
- Ninguna UI contiene reglas autoritativas de saldo, voto, quorum, permisos o firma.
- Ningún token de proveedor sustituye la identidad y autorización del dominio.
- Todo gateway local opera con credenciales independientes, alcance mínimo y posibilidad de revocación.
- **Ningún proveedor es fuente autoritativa de una regla legal, financiera o de gobernanza.**

---

## 8. Arquitectura de aplicaciones y plataforma

### 8.1 Capas

| Capa | Responsabilidad | Regla |
|---|---|---|
| Experiencia | Web, PWA, portal de portería, técnicos y proveedores | No contiene reglas autoritativas; utiliza design system y accesibilidad |
| Edge y acceso | CDN, WAF, TLS, BFF, rate limits, IAM y protección bot | Valida token, tenant, `correlation_id` y límites antes del dominio |
| Dominio | Casos de uso, entidades, políticas, servicios y eventos | No depende de UI ni modifica datos de otro contexto |
| Transversal | Notificaciones, documentos, audit, compliance, IA e integraciones | Reutilizable sin absorber reglas específicas del dominio |
| Datos/mensajería | Persistencia, objetos, outbox y read models | RLS forzado, cifrado, outbox/inbox, backups y retención |
| Plataforma | Compute, red, IaC, CI/CD, secretos, observabilidad y DR | Automatización, separación de ambientes y least privilege |

### 8.2 Arquitectura física inicial

| Componente | Decisión inicial (F1) | Cambio respecto de v1.0 |
|---|---|---|
| Edge | CloudFront, WAF, certificados y ALB; rate limit por tenant/usuario | — |
| API/BFF | ECS Fargate, mínimo dos tareas, stateless y distribuido entre zonas | — |
| Core | Monolito modular NestJS con bounded contexts y contratos internos | — |
| Workers | Despliegue separado para procesos críticos y batch; escalamiento por profundidad de cola | — |
| Base de datos | RDS PostgreSQL Multi-AZ; schemas lógicos por dominio; **RLS forzado y roles segregados** | Endurecido |
| Mensajería | **Outbox transaccional en PostgreSQL + Amazon SQS (colas) y EventBridge (enrutamiento por tipo)** | **Sustituye a Amazon MQ/RabbitMQ en F1** |
| Caché | **No se despliega en F1.** Rate limit en edge, locks y exclusión en PostgreSQL | **Redis diferido a F2** |
| Objetos | S3 con versionado; Object Lock selectivo y lifecycle; prefijo por tenant | Prefijo normalizado |
| Red | Subredes privadas; **VPC Gateway Endpoints para S3 e Interface Endpoints selectivos** para reducir dependencia y costo de NAT | Nuevo |
| Observabilidad | OpenTelemetry hacia backend administrado/CloudWatch/Grafana | — |
| IaC | Terraform/OpenTofu, estado cifrado, locking y policy-as-code | — |

### 8.3 Decisión de mensajería (ADR-006-R)

**Contexto.** La envolvente de capacidad de la Fase 1 prevé del orden de 50.000 eventos de negocio al día, aproximadamente 0,6 eventos por segundo de media. El patrón de *transactional outbox* ya obliga a que la fuente autoritativa de los hechos esté en PostgreSQL. El guardrail de costo de infraestructura es estrecho y el equipo de plataforma es *part-time*.

**Decisión.** En Fase 1, la entrega asíncrona se implementa como:

```
Transacción de dominio ──> tabla outbox (misma transacción)
                              │
                        relay (worker, SELECT ... FOR UPDATE SKIP LOCKED)
                              │
                    ┌─────────┴─────────┐
                 SQS (trabajo)     EventBridge (enrutamiento por tipo)
                              │
                        consumidor idempotente ──> tabla inbox (deduplicación)
```

**Justificación.** La comparación relevante no es RabbitMQ frente a Kafka, sino **broker dedicado frente a no tener broker**. Un broker gestionado en alta disponibilidad añade un componente que parchear, monitorear, dimensionar y pagar, sin demanda que lo justifique a este volumen. SQS y EventBridge son totalmente gestionados, tienen DLQ nativa, coste por uso prácticamente nulo a esta escala y transportan la misma envoltura CloudEvents. Esta decisión aplica directamente P-02 y P-13.

**Reversibilidad.** El dominio publica contra un puerto `EventPublisher`; el adaptador es intercambiable. La reintroducción de un broker dedicado requiere ADR con evidencia de: necesidad de topologías de enrutamiento no cubiertas, requisitos de *replay* de alto volumen, o límites de rendimiento medidos.

**Revisión obligatoria.** Al cierre de ARG-3, con datos reales de volumen, latencia de cola y costo.

### 8.4 Topología de cuentas y ambientes (nuevo en v2.0)

La separación de ambientes por cuenta es el control de aislamiento más efectivo y económico disponible, y debe declararse antes de escribir el primer módulo de infraestructura.

| Cuenta | Propósito | Reglas |
|---|---|---|
| `management` | Organización, SSO administrativo, facturación consolidada | Sin cargas de trabajo |
| `security-log` | Destino centralizado de logs, trazas de auditoría y hallazgos | Solo escritura desde otras cuentas; retención independiente |
| `backup` | Bóvedas de respaldo aisladas | **Vault Lock en modo compliance** para el nivel de evidencia regulada; credenciales separadas |
| `nonprod` | Desarrollo, integración, QA y staging | Sin datos productivos completos; apagado programado fuera de horario |
| `prod` | Producción | Acceso humano solo por break-glass auditado |

Reglas asociadas:

- Ningún principal de `nonprod` puede asumir roles en `prod`.
- Los respaldos se copian a `backup` con credenciales que producción no posee: un compromiso de producción no debe poder destruir los respaldos.
- El despliegue a producción ocurre exclusivamente desde el pipeline, con rol de despliegue de alcance mínimo y sin claves de larga duración.
- La topología es parte del IaC y se valida con *policy-as-code*.

### 8.5 Stack tecnológico

| Área | Tecnología aprobada | Notas |
|---|---|---|
| Lenguaje backend | TypeScript en modo strict | Un stack dominante para equipo full-stack |
| Runtime | Node.js LTS | Solo versiones LTS soportadas en producción |
| Framework | NestJS | Módulos, DI, OpenAPI, workers y evolución a servicios |
| Web/PWA | Next.js + React + TypeScript | SSR/SPA por caso; microfrontends solo con equipos independientes |
| Móvil futuro | React Native + Expo | Solo después del Gate nativo; empaquetado del PWA como paso intermedio evaluable |
| API | REST/JSON + OpenAPI 3.1 | Webhooks firmados; gRPC solo tras extracción justificada |
| Persistencia | PostgreSQL administrado | Prisma para CRUD; **SQL explícito obligatorio para RLS, ledger, invariantes y consultas críticas** |
| Caché | Redis administrado, **desde F2** | Nunca fuente autoritativa |
| Mensajería | Outbox + SQS/EventBridge + CloudEvents | Broker dedicado solo con evidencia (ADR-006-R) |
| Objetos | S3 | Versionado, cifrado y Object Lock selectivo |
| Paquetes | pnpm workspaces | Lockfile, dependencias bloqueadas y SBOM |
| Contenedores | Docker / OCI | Imágenes firmadas y escaneadas |
| Observabilidad | OpenTelemetry | Trazas, métricas y logs correlacionados |
| IaC | Terraform/OpenTofu | Cambios revisados por pull request y *policy-as-code* |

### 8.6 Repositorio y estructura

```
smartedify/
├─ apps/
│  ├─ web-admin/
│  ├─ web-portal/
│  ├─ api/
│  └─ workers/
├─ packages/
│  ├─ contracts/        # OpenAPI, JSON Schema de eventos, tipos compartidos
│  ├─ configuration/
│  ├─ observability/
│  ├─ testing/
│  └─ design-tokens/
└─ infrastructure/
   ├─ containers/
   ├─ terraform/
   └─ pipelines/

apps/api/src/
├─ platform/        # authentication, tenancy, audit, events, telemetry
├─ modules/         # bounded contexts de negocio
├─ integrations/    # payments, banking, messaging, signature, storage
└─ bootstrap/       # configuration, health, startup
```

### 8.7 Reglas de implementación modular y su verificación (endurecido en v2.0)

Reglas:

- Cada contexto tiene módulo, namespace, API interna, esquema de datos, eventos y pruebas de contrato.
- Las dependencias entre módulos se orientan hacia interfaces o puertos, no hacia tablas.
- Las capas de dominio no importan SDK de AWS, pasarelas, Cognito u otros proveedores.
- Los DTO externos no se reutilizan como entidades de dominio.
- Los workers consumen comandos o eventos idempotentes y registran checkpoints.
- Las migraciones de esquema no se ejecutan implícitamente al iniciar la aplicación.
- Los feature flags controlan release y riesgo; no sustituyen autorización ni entitlements.

**Verificación obligatoria (nuevo).** Estas reglas dejan de ser prosa y se convierten en controles bloqueantes del pipeline mediante análisis estático de dependencias (`dependency-cruiser`, reglas de frontera de ESLint o equivalente). El build **falla** ante:

| Violación | Detección |
|---|---|
| Import entre módulos que no pasa por el puerto público del contexto | Regla de grafo de dependencias |
| Import de SDK de proveedor desde `modules/**` | Lista negra de paquetes por carpeta |
| Import de una entidad de dominio ajena en lugar de su contrato | Regla de grafo |
| Referencia SQL a una tabla de otro schema de dominio | Análisis de las consultas explícitas y revisión de migraciones |
| Columna monetaria declarada como `float`/`double precision` | Consulta al catálogo de la base en CI |
| Tabla tenant-scoped sin `tenant_id`, sin RLS o sin `FORCE ROW LEVEL SECURITY` | Consulta al catálogo de la base en CI |

**Justificación.** Un monolito modular sin control automatizado de fronteras se degrada en un monolito a secas en menos de un año, que es exactamente el fracaso que ADR-001 pretende evitar. La disciplina no puede depender de la memoria de quien revisa el pull request.

### 8.8 Criterios de extracción a microservicios

| Criterio | Umbral orientativo | Evidencia |
|---|---|---|
| Escalado distinto | Dominio >30 % del compute o picos >5x del núcleo | Métricas por módulo y pruebas |
| Blast radius | Falla compromete funciones críticas no relacionadas | Postmortems y mapa de dependencias |
| Release independiente | Ventanas o frecuencia diferentes durante al menos tres meses | Historial de despliegues y bloqueos |
| Seguridad/regulación | Credenciales, conservación o segregación específica | Threat model y requisito validado |
| Ownership estable | Equipo y modelo de datos operables de forma independiente | Contrato maduro y pruebas |
| TCO positivo | Beneficio de extracción supera plataforma y operación adicional | Comparación económica en ADR |

> **Regla de evolución.** No se extrae un microservicio por preferencia tecnológica. Deben cumplirse **al menos dos criterios** y aprobarse un ADR con métricas, ownership y TCO.

**Candidato anticipado (nuevo en v2.0).** El primer caso que previsiblemente cumplirá los criterios es la **capa en tiempo real de Assembly** (sesión, emisión y cómputo de voto durante la ventana crítica): cumple *blast radius* —una asamblea saturando el núcleo afectaría pagos y tickets— y escalado distinto —picos de cientos a miles de concurrentes durante horas, y cero el resto del mes—, además de exigir un objetivo de disponibilidad superior.

**Decisión intermedia y reversible:** desde F4, Assembly se construye como **unidad de despliegue separada dentro del mismo repositorio y con el mismo contrato de datos** (servicio ECS propio, mismo esquema, mismos puertos). Esto aísla el riesgo operativo sin extraer el dominio ni fragmentar el modelo. La extracción completa, si procede, se decide con datos de la primera temporada de asambleas.

---

## 9. Arquitectura de datos, documentos y evidencia

### 9.1 Sistemas de registro

| Tipo | Sistema autoritativo | Uso |
|---|---|---|
| Datos transaccionales | PostgreSQL | Entidades, reglas, ledger, estados y auditoría referencial |
| Archivos y documentos | S3 | Originales, versiones, PDFs, firma, evidencia y archivo |
| Mensajes | Outbox/inbox en PostgreSQL + SQS/EventBridge | Entrega asíncrona y deduplicación |
| Caché | Redis (desde F2) | Datos efímeros y regenerables |
| Búsqueda | PostgreSQL FTS inicialmente | Consulta operativa; OpenSearch solo por necesidad medida |
| Analítica | Read models y warehouse posterior | KPI, portfolio, BI e IA sin cargar el OLTP |
| Logs/trazas | Backend de observabilidad | Diagnóstico, SLO y seguridad; **no sustituye auditoría** |

### 9.2 Aislamiento multi-tenant: contrato de implementación (endurecido en v2.0)

El principio de aislamiento por RLS se mantiene, pero se completa con las reglas que determinan si RLS funciona realmente. **Las tres formas más frecuentes de que RLS falle en silencio son las que se regulan aquí.**

**Reglas obligatorias (MUST)**

1. **Toda tabla tenant-scoped contiene `tenant_id` no nulo** y, cuando corresponda, `property_id` y `property_global_id`.
2. **RLS habilitado y forzado**: `ENABLE ROW LEVEL SECURITY` **y** `FORCE ROW LEVEL SECURITY` en cada tabla tenant-scoped. Sin `FORCE`, el propietario de la tabla omite las políticas y el aislamiento no existe en la práctica.
3. **Segregación de roles de base de datos**:

| Rol | Uso | Atributos |
|---|---|---|
| `smartedify_ddl` | Propietario de objetos; solo migraciones | No se usa en runtime |
| `smartedify_app` | Runtime de la aplicación y workers | `NOBYPASSRLS`, no superusuario, **no propietario de las tablas** |
| `smartedify_ro` | Lectura para analítica y soporte | `NOBYPASSRLS`, permisos mínimos, auditado |

   Ningún rol de aplicación tiene `BYPASSRLS` ni `SUPERUSER`. Esta condición se verifica en el pipeline y en el arranque de la aplicación.

4. **Contexto de tenant por transacción**: el contexto se establece con `SET LOCAL app.tenant_id = ...` **dentro de una transacción explícita**. Está prohibido el `SET` de sesión. Con un pooler en modo transacción, un `SET` de sesión persiste en la conexión reutilizada y filtra el contexto de un tenant a otro; es el fallo cross-tenant más frecuente en arquitecturas Node + PostgreSQL con pooling.
5. **Mecanismo en el ORM**: todo acceso a datos pasa por un envoltorio que abre transacción y aplica el preámbulo de contexto. Prisma no propaga variables de sesión de forma nativa; se usa `$transaction` con preámbulo explícito o una extensión de cliente equivalente. Existe una prueba que falla si algún repositorio ejecuta consultas fuera de ese envoltorio.
6. **El servidor nunca acepta `tenant_id` del cliente** como fuente de autoridad: se deriva del token y de la membresía validada.
7. **Índices, claves únicas y foreign keys incluyen `tenant_id`** cuando sea necesario para evitar colisiones y referencias cruzadas.
8. **Aislamiento fuera de la base**:

| Recurso | Regla |
|---|---|
| S3 | Prefijo `tenant/{tenant_id}/…` obligatorio; políticas por prefijo |
| Caché (desde F2) | Toda clave prefijada con `tenant_id`; prohibido cachear resultados sin discriminar tenant |
| Colas y DLQ | Atributo `tenant_id` en el mensaje; throttling por tenant |
| Logs, trazas y métricas | `tenant_id` obligatorio como atributo; nunca en texto libre |
| Exportaciones y backups | Conservan metadatos de tenant y autorización |

9. **Break-glass**: requiere justificación, expiración, doble control, sesión auditada y revisión posterior.

**Verificación obligatoria**

- **Prueba negativa generada, no escrita a mano.** Un test enumera el catálogo de tablas tenant-scoped y verifica, para cada una, que una consulta con contexto de tenant ajeno devuelve cero filas. Una prueba escrita a mano olvidará la tabla nueva; una generada, no.
- Verificación en CI de: `FORCE ROW LEVEL SECURITY` activo en todas las tablas tenant-scoped, ausencia de `BYPASSRLS` en roles de aplicación, y existencia de política *default deny* explícita.
- Objetivo permanente: **cero operaciones cross-tenant no autorizadas** (NFR-SEC-01).

### 9.3 Event sourcing selectivo

El event sourcing se limita a hechos de gobernanza y, cuando aporte valor, a ciertos movimientos de ledger. Catálogos, plantillas y preferencias usan persistencia transaccional convencional más auditoría.

| Se conserva como evento | No requiere event sourcing |
|---|---|
| `ConvocationPublished`, `AttendanceRegistered`, `QuorumChanged`, `VoteCast`, `VoteRejected`, `AgendaItemClosed`, `AssemblySuspended`, `MinutesSigned`, `AppealFiled` | Catálogos, textos auxiliares, preferencias, configuraciones de UI y borradores ordinarios |
| Eventos financieros cuando se necesite reconstrucción: `PaymentApproved`, `Applied`, `Settled`, `Reconciled`, `Refunded`, `ChargedBack` | Reportes derivados y vistas de consulta regenerables |

### 9.4 Concurrencia y unicidad (nuevo en v2.0)

Ningún flujo crítico puede depender de un lock distribuido en un componente declarado "nunca autoritativo". Las primitivas obligatorias son:

| Caso | Primitiva obligatoria |
|---|---|
| **Reserva de amenidad** | Restricción de exclusión en PostgreSQL sobre `(tenant_id, amenity_id, rango_horario)` con `btree_gist`, filtrada por estados `hold` y `confirmed`. Es transaccional, autoritativa y hace imposible el doble booking incluso ante reintentos concurrentes. El *hold* se modela como fila con `expires_at` y expiración idempotente |
| Idempotencia de comandos externos | Índice único sobre `(tenant_id, idempotency_key)` con almacenamiento de la respuesta original |
| Secuencias de negocio (numeración de comprobantes, asientos) | Secuencia por tenant/propiedad/periodo con bloqueo de fila, nunca contador en caché |
| Procesos batch y relay de outbox | `SELECT ... FOR UPDATE SKIP LOCKED` con checkpoint reanudable |
| Concurrencia optimista en entidades editables | Columna `row_version` y verificación en el `UPDATE` |
| Coordinación de tareas puntuales | *Advisory locks* de PostgreSQL |

### 9.5 Ledger e integridad financiera (endurecido en v2.0)

**Tipos de dato (MUST)**

| Concepto | Tipo | Prohibición |
|---|---|---|
| Importes monetarios | `NUMERIC(19,4)` | Prohibido `float`, `real`, `double precision` |
| Alícuotas y porcentajes de participación | `NUMERIC(12,10)` | Prohibido punto flotante binario |
| Moneda | `CHAR(3)` ISO 4217, obligatoria junto a todo importe | Prohibido importe sin moneda |
| Representación en JSON | `amount` como **string decimal** más `currency` | Prohibido número JSON (pérdida de precisión IEEE-754 en JavaScript) |

**Reglas de integridad (MUST)**

1. Partida doble con plan de cuentas por condominio y **por fondo**; toda operación genera asientos balanceados.
2. Los registros confirmados son inmutables; las correcciones se hacen mediante reversos y compensaciones, nunca por edición.
3. **El saldo es derivado del ledger, nunca una columna mutable.** Se materializa un *snapshot* al cierre de cada periodo y se verifica periódicamente que `snapshot == suma(movimientos)`.
4. `idempotency_key` y restricciones de unicidad evitan efectos repetidos.
5. El pago del proveedor conserva referencia interna, externa, moneda, importe, estado y evidencia.
6. El cierre de periodo bloquea posting no autorizado; la reapertura requiere maker-checker y genera versión nueva del estado publicado.
7. **Encadenamiento por hash del cierre**: al cerrar un periodo se calcula un hash sobre la secuencia ordenada de asientos y se almacena junto al cierre, encadenado con el hash del periodo anterior. Da evidencia de no alteración sin necesidad de blockchain, que permanece fuera de alcance.
8. Las exportaciones contables son derivados con checksum, no la fuente de verdad.

**Invariantes verificadas de forma continua**

| Invariante | Frecuencia | Acción ante violación |
|---|---|---|
| `Σ débitos = Σ créditos` por tenant, propiedad, fondo y periodo | Continua y al cierre | Alerta SEV-2 y bloqueo de cierre |
| `snapshot_saldo == Σ movimientos` | Diaria | Alerta SEV-2 |
| Ningún asiento confirmado modificado o eliminado | Continua | Alerta SEV-1 |
| Ningún movimiento cruza fondos sin asiento explícito autorizado | Continua | Alerta SEV-2 |
| Cero pagos aplicados dos veces | Continua | Alerta SEV-1 |

### 9.6 Alícuotas y aritmética de participación (nuevo en v2.0)

La aritmética de participación es un requisito de gobernanza disfrazado de detalle de implementación: de ella dependen el prorrateo de cuotas y el cálculo de quorum, y ambos son impugnables.

**Reglas (MUST)**

1. Precisión decimal fijada (§9.5); prohibido punto flotante.
2. **Invariante de suma**: la suma de alícuotas de las unidades de una propiedad debe igualar el total declarado en su reglamento interno (normalmente 100 %), con la tolerancia documentada por propiedad. La invariante se verifica al cargar, al modificar y de forma periódica; su violación bloquea la emisión de cargos y la apertura de asamblea.
3. **Regla de residuo de redondeo declarada y versionada**: el reparto del residuo derivado del redondeo usa el método de mayor resto, aplicado de forma determinista y reproducible. El método y su versión se almacenan con cada emisión y con cada cálculo de quorum.
4. Toda alícuota tiene vigencia, fuente documental y motivo de modificación; el cambio genera nueva vigencia y no sobrescribe la anterior.
5. Todo cálculo que use alícuotas registra la versión del conjunto de alícuotas empleado, de modo que el resultado sea reproducible años después.

### 9.7 Datos de gobernanza y verificabilidad del voto (nuevo en v2.0)

| Regla | Descripción |
|---|---|
| Padrón inmutable | El padrón es un *snapshot* firmado; cualquier cambio posterior genera un nuevo snapshot y queda registrado, nunca modifica el anterior |
| Encadenamiento de votos | Los votos de cada punto de agenda se encadenan por hash en orden de aceptación por el servidor |
| Recibo de voto | Al aceptar el voto, el sistema devuelve identificador y hash del registro |
| Raíz publicada | La raíz de la cadena por punto de agenda se publica en el acta, permitiendo verificar la inclusión sin revelar el sentido del voto |
| Quorum reproducible | Función pura de `(padrón_snapshot, eventos_de_asistencia, ruleset_version)`, con versión almacenada en el acta |
| Ámbito | Voto secreto, impugnaciones y criptografía avanzada pertenecen a *Assembly Advanced*; lo anterior es proporcionado al alcance de F4 |

### 9.8 Clasificación de datos

| Clase | Ejemplos | Controles |
|---|---|---|
| Pública | Contenido comercial aprobado | Integridad y publicación controlada |
| Interna | Configuraciones, métricas agregadas y documentos operativos no sensibles | Autenticación y need-to-know |
| Confidencial | Estados de cuenta, contratos, personas, tickets, egresos y evidencias | Cifrado, RBAC/ABAC, auditoría y minimización |
| Restringida | Voto secreto, credenciales, salud laboral, incidentes, claves y datos financieros críticos | Acceso reforzado, segregación, redacción y retención estricta |
| Evidencia regulada | Actas, firmas, ledger, rendiciones de cuentas aprobadas, legal hold y expedientes | Hash, WORM, sello de tiempo y verificación |

### 9.9 Niveles de firma

| Nivel | Mecanismo | Uso |
|---|---|---|
| F0 | Sin firma; registro generado por el sistema | Reportes, estados informativos y borradores |
| F1 | Aceptación autenticada | Acuses, autorización simple, confirmaciones y voto |
| F2 | Firma electrónica con evidencia reforzada | Contratos ordinarios, poderes, conformidades, convenios y **actas de carga y traspaso** |
| F3 | Firma digital dentro de la IOFE | Actas y documentos de alta criticidad cuando corresponda |
| F4 | F3 + sello de tiempo + expediente WORM + validación | Gobernanza crítica, actos registrales y controversias |

### 9.10 Niveles de evidencia

| Nivel | Contenido mínimo |
|---|---|
| E1 — Operativa | ID, tenant, actor, fecha, acción, resultado y versión |
| E2 — Íntegra | E1 + documento/hash, metadatos, IP/dispositivo y `correlation_id` |
| E3 — Probatoria | E2 + autenticación reforzada, consentimiento, historial y certificado del proveedor |
| E4 — Forense | E3 + firma digital, sello de tiempo, WORM, validación y legal hold |

### 9.11 Matriz de retención (con fundamento — ampliada en v2.0)

Se añade la columna **Fundamento**, que Legal/Compliance debe completar y aprobar antes de producción. Una retención sin fundamento declarado no es una política: es una preferencia.

| Clase | Firma | Evidencia | Retención base | Fundamento *(a completar por Legal)* |
|---|---|---|---|---|
| Reglamento, acta final, resoluciones y nombramientos | F3/F4 | E4 | Permanente / vida del condominio | Régimen de propiedad exclusiva y común |
| Convocatoria, padrón, poderes, votos y controversias | F1-F3 | E3/E4 | 10 años; legal hold si existe disputa | Prescripción civil / defensa |
| **Rendición de cuentas y estados publicados** | **F2/F3** | **E3/E4** | **10 años** | **Obligación de rendición y defensa** |
| Ledger, cargos, pagos, conciliación y estados emitidos | F0-F2 | E3/E4 | 10 años como política base | Obligaciones contables y tributarias — *verificar plazo aplicable* |
| Egresos y comprobantes de gasto | F0-F2 | E3 | 10 años | Idem |
| Contratos, adendas y conformidades | F2-F4 | E3/E4 | Vigencia + 10 años | Prescripción contractual |
| **Acta de carga y acta de traspaso** | **F2** | **E3** | **Permanente** | **Continuidad del expediente (P-16)** |
| OT y mantenimiento ordinario | F1/F2 | E2/E3 | 5 años; crítico o vida de activo + 10 años | Responsabilidad por vicios / seguridad |
| Comunicados y tickets ordinarios | F0/F1 | E2 | 2 a 5 años según impacto | Operativo |
| Visitantes y check-in/out | F1/F0 | E2 | 90 días | Minimización — protección de datos |
| Paquetería ordinaria | F0/F1 | E2 | 1 año | Operativo |
| CCTV sin incidente | No aplica | E1 | 30 días; máximo 60 si se justifica | Guía de videovigilancia |
| Fragmento asociado a incidente | F1/F2 | E4 | 5-10 años o expediente | Defensa / investigación |
| Consentimientos y solicitudes de derechos | F1/F2 | E3 | Vigencia + 5 años | Prueba de cumplimiento |
| Logs técnicos ordinarios | No aplica | Técnica | 30-90 días; seguridad 1 año | Seguridad de la información |

El tenant puede **ampliar** un plazo, nunca reducirlo por debajo del mínimo aplicable. Las métricas anonimizadas pueden conservarse tras eliminar identificadores.

### 9.12 Ciclo documental y legal hold

```
Draft → Approved → Signed → Final → Active → Archived → Eligible for Disposition
      → Disposition Approved → Deleted / Anonymized
```

- Los borradores no ingresan a Object Lock.
- El documento y su evidencia comparten política de retención.
- El legal hold suspende la eliminación por impugnación, auditoría, investigación, arbitraje, proceso o instrucción legal, **aunque haya vencido el periodo ordinario de retención**.
- La liberación del legal hold requiere autoridad definida distinta del solicitante, motivo y auditoría.
- La eliminación produce un **certificado de disposición** con alcance, regla, fecha y resultado.
- La baja de una persona desactiva accesos y anonimiza datos sin finalidad, pero conserva referencias necesarias en actas, pagos o auditoría.

---

## 10. Integraciones y proveedores

### 10.1 Patrones de integración

| Patrón | Uso | Controles |
|---|---|---|
| REST/OpenAPI | Interacción síncrona de clientes y proveedores | Versionado, autorización, `Idempotency-Key`, rate limit y `correlation_id` |
| CloudEvents sobre SQS/EventBridge | Hechos de dominio e integración | `schema_version`, outbox/inbox, DLQ, retry y replay |
| Webhook entrante | Notificación de proveedor | Firma, timestamp, ventana anti-replay, **consulta al recurso autoritativo** y deduplicación |
| Archivos CSV/XLSX/TXT | Bancos, ERP e importaciones | Original, antivirus, hash, staging, mapping, totales y aprobación |
| SFTP/host-to-host | Volumen Enterprise o automatización bancaria | Cifrado, cuentas técnicas, checksum y runbook |
| Saga | Reserva + cobro u otros procesos distribuidos | Estados explícitos, timeout, compensación e idempotencia |
| Adapter / Anti-corruption layer | Aislar SDK y modelos externos | Modelo canónico y portabilidad |

### 10.2 Principios de dependencia de proveedores

1. Todo proveedor se consume tras un **puerto del dominio** y un adaptador; el dominio nunca importa su SDK.
2. Las claves externas del proveedor se encapsulan en Integration Hub y **nunca** se convierten en identidad primaria del negocio.
3. Todo proveedor crítico tiene un **modo de contingencia documentado** y probado.
4. Toda afirmación de portabilidad requiere **evidencia de ensayo**, no solo diseño (§10.3).
5. Ningún proveedor es fuente autoritativa de una regla legal, financiera o de gobernanza.
6. Todo proveedor con costo variable tiene `metering_key` y conciliación de consumo (§5.15).

### 10.3 IAM

> **Proveedor seleccionado.** Amazon Cognito para autenticación. SmartEdify conserva memberships, roles, permisos y reglas de negocio.

- Un *user pool* B2B2C y un espacio separado para administración interna.
- MFA obligatorio para administradores, juntas y usuarios privilegiados; TOTP y passkeys preferidos sobre SMS.
- Tokens de acceso breves, rotación de refresh y step-up para pagos, bancos, firmas y gobierno.
- SAML/OIDC Enterprise como capacidad contractual (F6).
- **Passkeys/WebAuthn para perfiles privilegiados en F1.5**, por exposición al *phishing* de credenciales administrativas.

**Obligación de portabilidad demostrada (nuevo en v2.0).** La portabilidad afirmada por P-09 y ADR-012 se convierte en criterio de aceptación verificable: antes de ARG-3 debe existir un **ensayo documentado de migración** de un subconjunto de identidades a un segundo proveedor, incluyendo el plan de re-autenticación de contraseñas —que no son exportables— mediante migración progresiva o restablecimiento controlado. Sin ese ensayo, ADR-012 es un supuesto y debe declararse como riesgo abierto.

### 10.4 Pagos

| Elemento | Decisión |
|---|---|
| Proveedor principal | Mercado Pago, Checkout Pro alojado y OAuth por tenant |
| Segundo proveedor | Culqi cuando volumen, rechazo, precio o contingencia lo justifiquen |
| **Medios locales (evaluación obligatoria en F1)** | **Yape y Plin (QR o enlace con referencia estructurada), PagoEfectivo para pago en efectivo/agentes, y adquirentes locales (Izipay, Niubiz) como alternativas de tarjeta.** Decisión registrada en ADR-032 |
| Recaudación bancaria | BCP Recaudación/Telecrédito como primer conector directo; importador genérico para el resto |
| Custodia | Cada tenant usa su cuenta; SmartEdify **no concentra ni custodia fondos** |
| Tarjetas | SmartEdify no almacena PAN ni datos de tarjeta |
| **Alcance PCI DSS** | **SAQ A**: la captura de datos de tarjeta ocurre íntegramente en el entorno del proveedor mediante checkout alojado. SmartEdify no transmite, procesa ni almacena datos de titular de tarjeta. Se declara formalmente y se revisa ante cualquier cambio del flujo de pago |
| Recurrentes | Mandato expreso, aviso, límite, revocación y evidencia; no se asume que la cuota es fija |
| Split/comisión | Se habilita cuando el modelo comercial y contractual esté validado |
| Portabilidad | El `payment_order_id` interno es independiente del `transaction_id` del proveedor |

**Justificación de la evaluación de medios locales.** El diseño ya es portable, de modo que el costo de incorporar medios adicionales es bajo; el costo de no hacerlo es alto, porque una parte sustancial del pago de cuotas de condominio en el mercado objetivo ocurre por billeteras móviles interoperables, transferencia y pago en efectivo. La referencia estructurada por deuda debe soportar los formatos y longitudes de cada red, lo que es una restricción de diseño del identificador de deuda, no un detalle de integración.

**Estados y contracargos.** El ciclo de pago modela explícitamente `Created → Pending → Approved → Applied → Settled → (Refunded | ChargedBack | Reversed)`. Devolución y contracargo generan asientos compensatorios en el ledger y notificación al responsable; nunca edición del asiento original.

### 10.5 Mensajería

| Canal | Proveedor | Política |
|---|---|---|
| Centro interno | SmartEdify | **Fuente de verdad** de la notificación, preferencias y estado |
| Email | Amazon SES | Canal transaccional base; SPF, DKIM, DMARC, rebotes y suppression |
| Push | Firebase Cloud Messaging | Aviso operativo; no evidencia legal por sí solo; **no disponible en iOS sin PWA instalada** (§5.5) |
| WhatsApp | Meta WhatsApp Cloud API | Add-on; consentimiento, cuota, contenido mínimo y **categoría de plantilla declarada** |
| SMS | Proveedor según disponibilidad | Recuperación o alerta crítica, no canal estándar |

**Modelo de costo actualizado (nuevo en v2.0).** La plataforma de WhatsApp factura **por mensaje entregado**, no por conversación, con categorías diferenciadas (*marketing*, *utility*, *authentication*, *service*), tarifas que dependen del país del destinatario y **revisiones periódicas de tarifario**. Además, está anunciado que los mensajes de servicio dentro de la ventana de atención dejarán de ser gratuitos a partir de octubre de 2026. Consecuencias obligatorias:

1. Toda plantilla declara su **categoría** como atributo de primera clase; la clasificación correcta (utilidad frente a marketing) tiene impacto directo en el margen del add-on.
2. El costo por mensaje se registra por tenant, evento y categoría, y se concilia contra la facturación del proveedor (§5.15).
3. El precio del add-on se recalcula ante cada cambio de tarifario y ante el cambio de octubre de 2026, antes de comprometerlo contractualmente.
4. **Decisión pendiente de evidencia:** dado que WhatsApp es el canal donde ya vive la comunicación del condominio en el mercado objetivo, y que la baja adopción es un riesgo declarado, el piloto debe medir la diferencia de adopción con y sin WhatsApp para decidir si un cupo base se incluye en Core en lugar de venderse exclusivamente como add-on.

**Regla de contenido.** Los mensajes externos no incluyen deuda detallada, voto, datos biométricos ni documentos sensibles. Se envía un aviso mínimo y el usuario accede al contenido autenticado dentro de SmartEdify.

### 10.6 Streaming y firma

| Capacidad | Proveedor inicial | Regla |
|---|---|---|
| Streaming Assembly | Amazon IVS Real-Time | Publicadores limitados; mayoría suscriptora. **Voto y quorum permanecen fuera del proveedor** |
| Grabación | IVS → S3 Documents | Grabación compuesta por defecto; hash, retención y acceso restringido |
| Firma | Prestador acreditado con servicio verificado en el registro oficial | Contrato, DPA, SLA y servicio específico verificado |
| Sellado y validación | Proveedor acreditado / componentes IOFE | OCSP/CRL, cadena, timestamp y evidencia conservada por SmartEdify |

**Control de costo del evento.** El streaming se factura por minuto-participante; una asamblea de varios cientos de asistentes durante varias horas representa un costo material. El add-on Assembly Live incluye **estimador previo, tope configurable y alerta de consumo** antes y durante el evento.

### 10.7 Conciliación bancaria y formatos

| Prioridad | Fuente / formato | Uso |
|---|---|---|
| 1 | Webhook JSON de la pasarela | Actualización inmediata, validada y consultada por API |
| 2 | Reportes de liquidación CSV/API de la pasarela | Liquidaciones, comisiones, devoluciones, contracargos y control diario |
| 3 | Recaudación bancaria directa | Primer conector bancario; código y validación |
| 4 | Importador genérico CSV/XLSX/TXT | Otros bancos mediante mappings versionados |
| 5 | MT940 | Soporte técnico opcional para clientes que ya contraten el servicio |
| 6 | ISO 20022 camt.053 | Formato objetivo futuro |
| No admitido | PDF, capturas u OCR | Evidencia manual; **nunca fuente automática del ledger** |

### 10.8 Proceso de importación

```
Recepción → validación técnica → antivirus → hash/original → staging →
validación de estructura y totales → normalización → deduplicación →
matching → excepciones → aprobación → posting → cierre del lote
```

| Metadato de lote | Requisito |
|---|---|
| Identidad | tenant, cuenta, fuente, nombre, fecha y usuario/proceso |
| Integridad | SHA-256, número de filas, débitos, créditos y saldos cuando existan |
| Procesamiento | versión del parser, mapping, rechazados, duplicados y resultado |
| Auditoría | responsable, aprobación, `correlation_id` y evidencia |
| Idempotencia | un mismo archivo o fila no produce un segundo efecto |

### 10.9 Modelo canónico de movimiento bancario

```
bank_transaction_id, tenant_id, bank_connector_id, account_id,
account_number_masked, currency, booking_date, value_date, direction,
amount, balance_after, bank_reference, operation_code, transaction_type,
payer_name, payer_document, payer_account, description, channel,
source_file_id, source_row_number, source_hash, import_batch_id,
deduplication_key, reconciliation_status
```

### 10.10 Comprobantes electrónicos (nuevo en v2.0)

**Problema.** SmartEdify factura un servicio a las empresas administradoras y, según el modelo, puede intermediar en la emisión de comprobantes de la administradora. Ninguna versión anterior del documento contemplaba la emisión de comprobantes electrónicos, pese a que es una obligación tributaria del mercado objetivo y condiciona el modelo de datos de facturación.

**Decisión.** Se incorpora al alcance de `SVC-CORE-05` (D21), con el siguiente marco:

| Ámbito | Decisión |
|---|---|
| Comprobante del servicio SmartEdify a la administradora | **En alcance.** Emisión electrónica a través de un proveedor autorizado (OSE/PSE), con adaptador y modelo canónico propio |
| Comprobante del honorario de la administradora al condominio | **A definir con Legal/Tributario antes de fijar precios.** Si entra en alcance, se implementa con el mismo adaptador |
| Cuotas ordinarias del condominio a los propietarios | **Fuera de alcance como comprobante tributario** hasta que Legal determine su naturaleza. SmartEdify emite estado de cuenta y recibo interno, no comprobante fiscal, mientras no se resuelva |
| Arquitectura | Adaptador con modelo canónico, numeración por serie con secuencia bloqueante (§9.4), evidencia del acuse del proveedor y del organismo, y conservación conforme a la matriz de retención |

**Bloqueo explícito.** Esta definición es **prerrequisito de la fijación de precios y del cierre de G2**. Un modelo de facturación que descubre su obligación tributaria después del primer contrato genera reproceso contable y contractual.

### 10.11 Residencia, transferencias y contratos

El núcleo se despliega en AWS São Paulo. **Aclaración introducida en v2.0:** esta elección responde a latencia, disponibilidad de servicios y consideraciones comerciales, y debe declararse como tal. La normativa peruana de protección de datos regula el flujo transfronterizo mediante garantías y niveles adecuados de protección, no mediante una obligación general de localización; corresponde a Legal confirmar si existe alguna restricción específica aplicable. La región seleccionada tiene un sobreprecio apreciable frente a otras regiones, que se acepta conscientemente y se registra en el modelo de costo.

| Proveedor | Datos permitidos | Datos restringidos |
|---|---|---|
| IAM | Identificador, email/teléfono y factores | Deuda, voto, documentos y alícuotas |
| Pasarela | Orden, importe, referencia y datos mínimos | Datos de convivencia, documentos o voto |
| Email/Push/WhatsApp | Dirección/token y aviso mínimo | Estado financiero detallado y contenido restringido |
| Streaming | Identificador seudónimo y token temporal | Derecho a voto, deuda o reglas jurídicas |
| Firma | Documento necesario y evidencia | Información ajena al acto de firma |
| IoT | Dispositivo, evento y referencia mínima | Datos personales no necesarios o biometría no aprobada |

- DPA obligatorio, inventario de subencargados y ubicación declarada.
- Cifrado en tránsito y reposo, notificación de incidentes y plazo de eliminación.
- Exportabilidad, derecho de auditoría, soporte y plan de continuidad.
- Webhooks firmados, credenciales gestionadas y rotación.

---

## 11. Seguridad, privacidad y cumplimiento

### 11.1 Modelo Zero Trust

SmartEdify aplica verificación explícita, privilegio mínimo y asunción de compromiso. La confianza no deriva de la red, la ubicación ni el dispositivo; cada operación se autoriza sobre el recurso, tenant, rol, atributos, nivel de autenticación y riesgo.

| Control | Aplicación |
|---|---|
| Autenticación | OIDC/OAuth2, MFA, PKCE, sesiones breves, revocación y step-up |
| Autorización | RBAC para responsabilidad y ABAC para tenant, propiedad, unidad, ownership, estado y finalidad |
| Aislamiento | Tenant context, RLS forzado, pruebas negativas generadas, scopes y segregación de soporte |
| Cifrado | TLS, KMS, cifrado de base/objetos/backups y campos adicionales cuando sea necesario |
| Secretos | Gestor de secretos; prohibidos en código, imágenes, variables no protegidas o logs |
| Auditoría | Acciones críticas, cambios de privilegio, lecturas/exportaciones sensibles y break-glass |
| Protección edge | WAF, rate limit, bot protection, límites de payload y validación de origen |
| Respuesta | Alertas, runbooks, preservación de evidencia, contención y notificación |

### 11.2 Matriz de autorización

| Capacidad | Administrador | Junta | Residente | Portería | Proveedor | Auditor |
|---|---|---|---|---|---|---|
| Configurar propiedad | A/R | C | – | – | – | R lectura |
| Emitir cargos / conciliar | A/R | C | R propia | – | – | R lectura |
| **Registrar egreso** | **A/R** | **C** | – | – | – | **R lectura** |
| **Aprobar rendición de cuentas** | **R** | **A** | **C** | – | – | **R lectura** |
| Crear / resolver ticket | A/R | C | R | R | R asignado | R lectura |
| Gestionar visita / paquete | C | – | R propia | A/R | – | R lectura |
| Crear / ejecutar OT | A/R | C | C | C | R asignado | R lectura |
| Convocar asamblea | R | A | C | – | – | R lectura |
| Emitir voto | – | Según regla | R según unidad | – | – | R evidencia |
| Firmar acta | C | A/R autorizado | – | – | – | R validación |
| **Autorizar traspaso de administración** | **C** | **A** | – | – | – | **R lectura** |
| Aplicar legal hold | – | – | – | – | – | Legal/Compliance |

`A = Accountable; R = Responsible/permitido; C = Consultado.` La matriz detallada se configura por tenant y caso de uso, dentro de límites de plataforma. **Ningún rol por sí solo puede modificar saldos históricos, liberar legal holds, ejecutar ajustes críticos ni autorizar un traspaso sin control adicional.**

### 11.3 Segregación de funciones

| Acción | Control mínimo |
|---|---|
| Cambio de cuenta bancaria o credenciales de pago | Step-up + maker-checker + aviso |
| Ajuste manual de saldo, devolución o reapertura de periodo | Maker-checker, motivo, evidencia y auditoría |
| **Cierre y publicación de rendición de cuentas** | **Preparador y aprobador distintos; aprobación de la junta registrada** |
| **Movimiento entre fondos** | **Maker-checker + acuerdo que lo respalde** |
| Cambio de regla de quorum/mayoría | Autor autorizado, versión, simulación y aprobación legal/tenant |
| Cambio de rol privilegiado | Step-up, segundo aprobador y expiración cuando aplique |
| Exportación masiva de datos | Justificación, alcance, marca de agua/registro y acceso temporal |
| Break-glass de soporte | Aprobación, tiempo limitado, sesión grabada/auditada y revisión posterior |
| Liberación de legal hold | Autoridad Legal/Compliance distinta del solicitante |
| **Traspaso de administración** | **Doble autorización: custodio del condominio + constancia de término del tenant origen** |

### 11.4 Secure SDLC

| Etapa | Controles |
|---|---|
| Planificación | Clasificación de datos, abuso, privacidad, NFR y criterios de seguridad |
| Diseño | Threat model, límites de confianza, ADR, permisos, retención y fallos seguros |
| Código | Revisión, lint, tipos strict, SAST, secret scan, dependencias y pruebas unitarias |
| Build | SBOM, pinning, provenance, firma y escaneo de imagen |
| Integración | Contract tests, **RLS cross-tenant generado**, migrations, DAST y compatibilidad de eventos |
| Preproducción | E2E, accesibilidad, carga, restore, pentest por riesgo y runbooks |
| Producción | Canary/blue-green, feature flags, aprobación por riesgo, monitoreo y rollback |
| Operación | Vulnerabilidades, incidentes, postmortem, rotación, parchado y métricas |

Línea base de verificación: OWASP ASVS Nivel 2 para web/API y OWASP MASVS para la aplicación móvil cuando se apruebe. Las funciones financieras, de gobernanza y de soporte privilegiado reciben pruebas de abuso específicas.

### 11.5 Privacidad por diseño

- Inventario de tratamientos: finalidad, base, categoría, destinatario, país, retención y responsable.
- Minimización: no solicitar copia de documento de identidad, biometría, fecha de nacimiento o datos de terceros por defecto.
- Consentimiento cuando corresponda, separado de la aceptación general y revocable.
- Derechos de acceso, rectificación, cancelación y oposición con expediente y plazo.
- Seudonimización en analítica, IA, streaming y pruebas.
- **Datos de producción prohibidos en ambientes de desarrollo**; datasets sintéticos o anonimizados.
- Evaluación de impacto para biometría, IA de alto impacto, videovigilancia integrada, localización o perfilamiento.
- Registro de transferencias, DPA y subencargados; configuración de no entrenamiento para proveedores de IA.

### 11.6 Cadena de responsable y encargado del tratamiento (nuevo en v2.0)

El modelo `tenant = administradora` tiene una consecuencia jurídica que ninguna versión anterior explicitaba y que determina quién firma qué, quién responde ante la autoridad y quién conserva los datos al término del contrato.

| Actor | Rol probable | Implicación |
|---|---|---|
| Junta de propietarios | Responsable del tratamiento respecto de los datos de propietarios y residentes, en tanto órgano del condominio | Titular del expediente; autoriza el traspaso; ejerce derechos sobre los datos del condominio |
| Empresa administradora (tenant) | Encargado de la junta, y responsable respecto de sus propios trabajadores y datos comerciales | Contrata a SmartEdify; instruye el tratamiento |
| SmartEdify | Encargado de la administradora y, por tanto, **subencargado** respecto de la junta | Trata datos solo bajo instrucción; no decide finalidades |
| Proveedores (IAM, pasarela, mensajería, firma, streaming) | Subencargados de SmartEdify | Requieren DPA, ubicación declarada e inventario |

**Obligaciones derivadas (a ejecutar antes del primer piloto con datos reales):**

1. Documentar formalmente la cadena y reflejarla en el contrato marco y en el DPA.
2. Declarar en el contrato la **titularidad de los datos del condominio** y su destino al término, coherente con P-16 y con §6.9/§6.10.
3. Definir el procedimiento de atención de derechos: quién recibe la solicitud, quién la resuelve y en qué plazo, cuando el titular se dirige a SmartEdify en lugar de a la administradora.
4. Mantener el inventario de subencargados actualizado y notificable.

### 11.7 Marco peruano y gates legales

| Referencia | Implicancia de producto |
|---|---|
| Ley N.º 27157 y D.S. N.º 035-2006-VIVIENDA | Unidades exclusivas/comunes, reglamento interno, junta y gobernanza; **las reglas requieren validación legal por tenant** |
| Ley N.º 29733 y su reglamento vigente (D.S. N.º 016-2024-JUS) | Protección de datos, derechos, seguridad, encargados, transferencias y notificación de incidentes |
| Ley N.º 27269 y reglamentación IOFE | Firma electrónica/digital, acreditación, certificados, validación y evidencia |
| Ley N.º 29783 y reglamento | Registros de SST y obligaciones laborales para futuras capacidades HR |
| Normativa tributaria (SUNAT) | Comprobantes electrónicos, exportables, trazabilidad y adaptadores versionados |
| Directiva y guía de la autoridad sobre videovigilancia | Minimización, carteles, acceso restringido, conservación de video y responsabilidad de administradores |

> **Advertencia jurídica.** La arquitectura habilita controles y evidencia, pero **no determina por sí sola** la validez de convocatorias, votos, firmas, plazos, formalidades notariales o registros. Las reglas, plantillas y clases documentales deben ser aprobadas por especialistas competentes.

**Gates legales bloqueantes (nuevo en v2.0)**

| Gate | Momento | Contenido | Bloquea |
|---|---|---|---|
| GL-1 Protección de datos | Antes del primer piloto con datos reales | Cadena de encargados, DPA, inventario de tratamientos, procedimiento de derechos y confirmación de obligaciones formales vigentes ante la autoridad | ARG-2 |
| GL-2 Tributario | Antes de fijar precios | Naturaleza de cuotas y honorarios; obligación de comprobante electrónico y su alcance (§10.10) | G2 |
| GL-3 Retención | Antes de producción | Fundamento de cada fila de la matriz de retención (§9.11) | ARG-2 |
| GL-4 Gobernanza por tenant | Antes de activar Assembly en cada condominio | Compatibilidad entre el flujo digital y el reglamento interno del condominio, firmada por el especialista; vía de contingencia presencial documentada | Activación del módulo por propiedad |

### 11.8 Derechos, offboarding y portabilidad

- El ejercicio de derechos por el titular tiene expediente, responsable y plazo, y se registra como evidencia.
- La **exportación completa y la certificación de eliminación son capacidades del producto desde F1**, no una prestación Enterprise. La obligación contractual y de protección de datos existe desde el primer cliente (§6.10).
- La exportación usa formatos abiertos y documentados, con manifiesto y hashes verificables.
- El legal hold vigente prevalece sobre cualquier solicitud de eliminación y su conflicto se resuelve de forma documentada por Legal/Compliance.

### 11.9 Seguridad de IA

- RAG solo con corpus autorizado, fechado, versionado y citado en la respuesta.
- Protección frente a inyección de prompts, exfiltración de datos y abuso de herramientas.
- No se envían datos restringidos sin DPA, evaluación de transferencia y configuración de no entrenamiento.
- **La salida de IA nunca altera ledger, voto, rule set, entitlement o documento firmado sin comando humano autorizado.**
- Registro de `model_id`, versión, plantilla de prompt, fuentes, clasificación de entrada, salida, revisor, decisión y feedback.
- Evaluaciones offline, red teaming, filtros, límites, monitoreo y rollback de modelo/prompt.
- No se presenta la IA como asesoría legal, contable, médica, laboral o financiera autoritativa.

### 11.10 Seguridad de integraciones y dispositivos

- Credenciales independientes por conector y dispositivo; rotación y revocación.
- Gateways IoT en red segmentada, sin acceso entrante directo desde internet cuando sea evitable.
- Webhooks con firma, timestamp, nonce o ventana anti-replay y consulta posterior.
- Archivos con antivirus, validación de tipo real, tamaño, checksum y almacenamiento en cuarentena.
- Deserialización segura, límites de profundidad y rechazo de campos desconocidos en interfaces críticas.
- SDK de terceros revisados, inventariados y con versión bloqueada.
- Modo de contingencia documentado para cada proveedor crítico.

---

## 12. Disponibilidad, capacidad, recuperación y FinOps

### 12.1 Niveles de criticidad y SLO

| Tier | Funciones | Disponibilidad objetivo | Latencia objetivo | RPO/RTO |
|---|---|---|---|---|
| T1 | Auth, pagos, ledger, webhooks, acceso QR crítico, asistencia, quorum, voto y firma crítica | 99.9 % mensual; Assembly 99.95 % en ventana crítica | Lectura ≤700 ms; escritura ≤1 s; voto ≤700 ms | Dentro de región: ≤5 min / ≤30 min |
| T2 | Estado de cuenta, cobranza, rendición de cuentas, tickets, reservas, visitantes, paquetes, documentos y Maintenance | 99.9 % en GA; 99.5 % en piloto | Lectura ≤700 ms; escritura ≤1 s | ≤30 min / ≤4 h |
| T3 | BI, reportes complejos, marketplace no crítico e IA | 99.5 % en GA | Interacción ≤3 s; batch por SLA | ≤24 h / ≤24 h |

La ventana crítica de Assembly comienza 60 minutos antes del evento y termina 60 minutos después del cierre. La disponibilidad se mide desde la experiencia del usuario y excluye solicitudes inválidas o dependencias explícitamente fuera del compromiso contractual.

### 12.2 Presupuesto de error

| Consumo | Acción |
|---|---|
| <50 % | Entrega normal y activación gradual |
| 50-75 % | Revisar causas, reducir cambios de riesgo y priorizar confiabilidad |
| 75-100 % | Congelar cambios no esenciales en T1 y ejecutar plan de estabilización |
| Agotado | Suspender nuevas funciones críticas, postmortem y aprobación ejecutiva para excepciones |

### 12.3 Objetivos de integridad

| Indicador | Objetivo |
|---|---|
| Operaciones cross-tenant no autorizadas | 0 |
| Pagos o votos contabilizados dos veces | 0 |
| Votos confirmados y perdidos | 0 |
| Movimientos de ledger no balanceados | 0 |
| **Movimientos entre fondos sin asiento autorizado** | **0** |
| **Propiedades con suma de alícuotas fuera de tolerancia** | **0** |
| Archivos publicados con diferencia de control | 0 |
| Documentos finales sin hash o clase | 0 |
| Acciones críticas sin auditoría | 0 |
| Legal holds liberados sin autorización | 0 |
| **Recordatorios de cobranza a unidades sin deuda** | **0** |

### 12.4 Envolvente inicial de capacidad

| Variable | Piloto / capacidad inicial de diseño |
|---|---|
| Tenants | 3-10 empresas administradoras |
| Propiedades | 10-30 condominios |
| Unidades | 500-2,000 |
| Identidades | Hasta 5,000 |
| Concurrencia ordinaria | 150 usuarios |
| Portería/técnicos concurrentes | 50 |
| Assembly de prueba | 500 participantes |
| Eventos de negocio/día | 50,000 (≈0.6/s de media) |
| Documentos/año equivalentes | 100,000 |
| Movimientos por archivo | 10,000 |
| Campaña de notificación | 20,000 mensajes |

La capacidad se prueba al menos a 2x el pico ordinario, 3x en emisión de cuotas, **3x en corrida de cobranza**, 5x en campañas y 1.5x en asistentes de Assembly. El dimensionamiento se basa en concurrencia, eventos y uso, no solo en usuarios registrados.

### 12.5 Escalamiento y headroom

| Recurso | Umbral de atención / regla |
|---|---|
| ECS API | CPU sostenida 55-60 % objetivo; memoria <70 %; mínimo 2 y máximo inicial 6 tareas |
| Workers críticos | Mínimo 2 antes de GA; escala por antigüedad de cola y throughput |
| Workers batch | 0/1 mínimo y máximo inicial 6; throttling por tenant |
| PostgreSQL | CPU >65 %, conexiones >70 %, storage >70 %, lock waits o degradación p95 |
| Colas (SQS) | Antigüedad del mensaje, profundidad, DLQ y *consumer lag*; el outbox permite recuperación sin pérdida autoritativa |
| S3 | Lifecycle, cuota y costos por tenant; no transferir video continuo al repositorio general |

### 12.6 Recuperación ante desastres

| Escenario | RPO | RTO |
|---|---|---|
| Falla de tarea ECS | 0 | ≤5 min |
| Despliegue defectuoso | 0 | ≤15 min |
| Falla de zona | Cercano a 0 | ≤30 min |
| Falla de cola/enrutador | 0 para datos autoritativos | ≤30 min |
| Eliminación accidental de objeto versionado | 0 | ≤30 min |
| Corrupción lógica de base | ≤5 min | ≤2 h |
| Pérdida completa de región — estándar | ≤24 h | ≤8 h |
| Pérdida de región — Enterprise warm standby | ≤15 min | ≤2 h |

F1 y F1.5 usan *backup-and-restore* cross-region sin compute permanente. F2 y F3 evolucionan a *pilot light* con IaC, imágenes, copias y DNS preparados. *Warm standby* solo se activa cuando un contrato Enterprise cubre infraestructura, pruebas y soporte.

### 12.7 Backups y restore testing

| Activo | Política base |
|---|---|
| PITR de base de datos | Continuo, 35 días |
| Snapshot diario | 35 días |
| Snapshot semanal | 12 semanas |
| Snapshot mensual | 12 meses |
| Copia cross-region | Diaria, 35 días |
| **Copia cross-account** | **Diaria** para datos autoritativos; semanal para el resto |
| **Bóveda inmutable** | **Vault Lock en modo compliance para el nivel de evidencia regulada** |
| S3 | Versionado, Object Lock selectivo, lifecycle y replicación de evidencia crítica |
| Restore de base | Trimestral en piloto, mensual en GA |
| Restore de documentos | Trimestral en piloto, mensual en GA |
| Ejercicio regional | Mesa semestral en piloto; failover semestral en GA; trimestral Enterprise |

> **Criterio de backup.** Un backup no se considera válido porque el job figure como completado. Debe **restaurarse, iniciar la aplicación, mantener aislamiento, cuadrar el ledger, validar hashes y demostrar el RPO/RTO**. Un restore no verificado es una suposición.

### 12.8 Operación de Assembly

| Momento | Controles |
|---|---|
| Antes | Load test, freeze, preescalamiento, padrón, streaming, firma, canales, runbook y guardia |
| Durante | Dashboard de latencia, votos, quorum, errores, colas, saturación, streaming, consumo de streaming y seguridad |
| Después | Reconciliar conteos, publicar raíz de verificación, cerrar expediente, hash/firma, revisar incidentes y postmortem |

No se realizan despliegues funcionales durante las 24 horas previas a una asamblea productiva, salvo corrección crítica aprobada y ensayada.

### 12.9 Guardrails de costo (revisados en v2.0)

**Corrección del guardrail anterior.** El presupuesto de 1.200–1.500 USD mensuales para cubrir desarrollo, QA, staging, producción, seguridad y observabilidad omitía componentes de costo material —en particular la salida a internet desde subredes privadas— y no reflejaba el sobreprecio de la región seleccionada. El guardrail se reformula con supuestos explícitos y palancas declaradas.

| Concepto | Guardrail |
|---|---|
| Infraestructura AWS en F1 (todos los ambientes) | **1.500–2.200 USD/mes**, con las palancas de reducción activas |
| AWS base en GA | ≤8 % del MRR |
| Infraestructura + proveedores directos | ≤15 % del MRR |
| Margen bruto SaaS | ≥80 %, excluyendo pagos pass-through |
| Variación mensual no explicada | <10 % |
| Servicios variables | Streaming, WhatsApp, SMS, firma e IA con cuota, tope y medición por tenant |
| Savings Plans | Solo tras tres meses de consumo estable |
| Enterprise DR | Precio contractual cubre compute, pruebas y guardia |

**Palancas obligatorias de reducción**

1. **Reducir dependencia de NAT**: *VPC Gateway Endpoints* para S3 (sin costo por hora) e *Interface Endpoints* selectivos; una sola salida en no-producción.
2. **Consolidar ambientes en F1**: QA y staging comparten infraestructura hasta ARG-2; se separan antes de GA.
3. **Apagado programado de no-producción** fuera de horario laboral.
4. **No desplegar Redis en F1** ni broker dedicado (§8.3), conforme a P-02.
5. **Retención controlada de logs y trazas** (§13.6), que suele ser el segundo mayor costo oculto después de la red.
6. Etiquetado obligatorio de todos los recursos con `environment`, `service`, `domain`, `owner`, `cost_center`, `tenant_scope`, `data_classification` y `criticality`.

Presupuestos, detección de anomalías de costo y responsables por etiqueta son obligatorios desde el primer día. **Los montos son límites internos de diseño y deben recalibrarse con cotizaciones y consumo real**; su incumplimiento sostenido durante dos meses obliga a revisión de arquitectura.

### 12.10 Métricas FinOps

- Costo por tenant, propiedad, unidad activa y usuario activo.
- Costo por pago, documento, 1.000 notificaciones **por categoría de plantilla**, firma y hora de streaming.
- Costo por importación bancaria, orden de trabajo y asamblea.
- **Margen por add-on calculado contra consumo medido y conciliado**, no estimado.
- Uso y margen por add-on; *noisy neighbors* y límites de plan.
- Derechos de tamaño mensuales, apagado de no producción y retención controlada de logs.

---

## 13. DevSecOps, calidad y observabilidad

### 13.1 Ambientes

| Ambiente | Cuenta | Finalidad | Datos |
|---|---|---|---|
| Local | — | Desarrollo y pruebas unitarias | Sintéticos |
| Integration | `nonprod` | Pruebas de servicios, contratos y migraciones | Sintéticos y fixtures |
| QA | `nonprod` | E2E, seguridad funcional y accesibilidad | Sintéticos/anonimizados |
| Staging | `nonprod` | Paridad, performance, restore y UAT | Anonimizados; sin datos productivos completos |
| Production | `prod` | Servicio a clientes | Reales, clasificados y auditados |
| DR test | `backup` + `nonprod` | Restauración y ejercicios | Copias protegidas con acceso temporal |

En F1, QA y Staging comparten infraestructura (§12.9) y se separan antes de GA.

### 13.2 Pipeline CI/CD

| Gate | Criterios bloqueantes |
|---|---|
| Pull request | Revisión, ADR cuando aplica, lint, typecheck, unit tests, secret scan y **verificación de fronteras modulares** (§8.7) |
| Build | Lockfile, SBOM, vulnerabilidades, firma de imagen y provenance |
| Integration | Contract tests, migraciones, **prueba negativa RLS generada**, verificación de catálogo (FORCE RLS, tipos monetarios), schema de eventos e idempotencia |
| QA/Staging | E2E, DAST, accesibilidad, smoke, performance regression y restore según riesgo |
| Production | Aprobación basada en riesgo, canary/blue-green, feature flags y migrations separadas |
| Post-deploy | SLO, errores, métricas de negocio, seguridad y rollback automático/manual |

### 13.3 Estrategia de pruebas

| Nivel | Cobertura |
|---|---|
| Unitarias | Entidades, value objects, reglas, cálculos, validadores, permisos y serialización |
| Integración | PostgreSQL/RLS, repositorios, outbox/inbox, archivos, colas y adaptadores |
| Contrato | OpenAPI, webhooks, eventos, mappings y compatibilidad de versiones |
| E2E | Flujos críticos por rol y tenant, incluyendo fallos y recuperación |
| Seguridad | Abuso, autorización, cross-tenant, secretos, DAST, SAST y pentest |
| **Invariantes** | **Balance del ledger, suma de alícuotas, unicidad de voto, no duplicación de pagos** |
| Performance | Carga, estrés, soak, campaña, **corrida de cobranza**, batch y ventana de Assembly |
| Resiliencia | Retry, timeout, circuit breaker, proveedor, AZ, restore y rollback |
| Accesibilidad | Automática y manual en web/PWA; teclado, lector y contraste |
| Privacidad | Minimización, retención, derechos, exportación y eliminación |
| Operacional | Runbooks, alertas, soporte, conciliación y contingencia |

### 13.4 Cobertura obligatoria por riesgo

| Función | Pruebas imprescindibles |
|---|---|
| Tenant | RLS con y sin `FORCE`, filtración indirecta, clave de caché, exportación, logs y batch |
| Pagos | Duplicados, reintentos, orden de eventos, devolución, chargeback y cierre |
| Conciliación | Totales, deduplicación, parsing, score, conflictos, maker-checker y replay |
| **Cobranza** | **Cálculo de aging en bordes de tramo, suspensión al pagar, no reenvío, y cero envíos a unidades sin deuda** |
| **Egresos y fondos** | **Imputación a fondo, balance por fondo, cierre, reapertura y publicación versionada** |
| Reservas | Concurrencia real contra la restricción de exclusión, expiración de hold, pago fallido, cancelación y penalidad |
| Maintenance | Offline, evidencias, reapertura, SLA, proveedor y generación preventiva |
| Assembly | Snapshot, representación, quorum, precisión decimal, voto repetido, **verificación de la cadena de hashes**, suspensión, carga y recuperación |
| Documentos | Hash, firma, Object Lock, lifecycle, legal hold, acceso y disposición |
| **Onboarding** | **Idempotencia del lote, rollback, saldos de apertura, acta y reintento parcial** |
| **Traspaso/offboarding** | **Doble autorización, integridad del paquete exportado, continuidad del histórico y certificado de disposición** |
| Integraciones | Firma, replay, timeout, rate limit, DLQ y fallback |

### 13.5 Observabilidad

| Señal | Contenido | Alertas |
|---|---|---|
| Métricas técnicas | RED/USE, conexiones, profundidad y antigüedad de cola, DB lag, storage | SLO burn, saturación, error ratio, DLQ y backup |
| Métricas de negocio | Pagos, conciliación, **aging y efectividad de cobranza**, egresos, tickets, OT, votos, quorum y adopción | Desviación, fallos silenciosos y backlog |
| **Invariantes** | **Balance del ledger, alícuotas, duplicación de pagos/votos** | **SEV-1/SEV-2 inmediata** |
| Trazas | BFF → dominio → DB/proveedor; spans asíncronos | Latencia por dependencia, módulo y tenant |
| Logs | Estructurados; security/audit separados; redacción de sensibles | Anomalías de auth, break-glass, replay y exportación |
| Experiencia | RUM, Core Web Vitals, fallos de red, **tasa de instalación de PWA** | Regresión por versión, navegador y dispositivo |
| Costos | Servicio, ambiente, tenant y unidad de consumo | Anomalía, cuota, noisy neighbor y margen |
| **Sintéticas** | **Login, estado de cuenta, orden de pago y emisión de voto, ejecutadas desde fuera** | **Fallo de recorrido crítico** |

Cada request propaga `trace_id`, `correlation_id`, `tenant_id`, subject seudonimizado, `operation` y `client_version`. **Los payloads sensibles no se registran.** La auditoría de negocio es un dominio distinto de los logs técnicos y no se sustituyen entre sí.

### 13.6 Retención de observabilidad

| Dato | Retención inicial |
|---|---|
| Logs de aplicación | 30 días |
| Logs de error | 90 días |
| Logs de seguridad | 1 año |
| Auditoría crítica | Según matriz documental |
| Trazas completas | 7-14 días |
| Trazas muestreadas | 30-90 días |
| Métricas agregadas y RUM sin PII | 13 meses |
| Payloads externos | Según finalidad y clase documental |

### 13.7 Migraciones y compatibilidad

- Patrón expand/contract: agregar compatible → backfill → cambiar aplicación → retirar después.
- Migraciones separadas del arranque, con locking controlado, métricas y timeout.
- Migración destructiva requiere backup verificado, dry run y forward-fix/rollback.
- Backfills por lotes con checkpoint, throttling y alcance por tenant.
- APIs y eventos mantienen compatibilidad durante la ventana publicada (§14.3).
- Cambios de reglas y cálculos tienen *effective date*; los procesos históricos conservan su versión.
- Feature flags permiten rollback funcional sin revertir datos incompatibles.

---

## 14. Convenciones técnicas (capítulo normativo — ampliado en v2.0)

Las convenciones son obligatorias. Lo que no está regulado aquí se decide por consenso del equipo y se incorpora en la siguiente versión del documento; lo que sí está regulado no se decide por proyecto.

### 14.1 Nomenclatura general

| Elemento | Convención | Ejemplo |
|---|---|---|
| API resource | Plural, kebab-case, sustantivo | `/v1/assemblies/{id}/agenda-items` |
| Command endpoint | Verbo solo cuando no es CRUD natural, como sub-recurso `actions` | `POST /v1/assemblies/{id}/actions/close` |
| Event type | `com.smartedify.<dominio>.<entidad>.<hecho-pasado>.v<N>` | `com.smartedify.finance.payment.received.v1` |
| Cola / bus | `<dominio>.<propósito>.v<N>` — **sin ambiente en el nombre** | `governance.events.v1` |
| DB schema | `snake_case` por dominio | `governance`, `finance`, `documents` |
| Tabla | `snake_case`, **plural** | `assembly_votes`, `ledger_entries` |
| Columna | `snake_case`, singular | `tenant_id`, `posted_at` |
| Métrica de negocio | `smartedify_<dominio>_<métrica>_<unidad>`; sufijo `_total` en contadores | `smartedify_vote_accept_duration_seconds` |
| Métrica técnica | Convenciones semánticas de OpenTelemetry | `http.server.request.duration` |
| Feature flag | `dominio.capacidad.variante` | `maintenance.offline_sync.v1` |
| Rama | `tipo/ticket-descripcion-corta` | `feat/SE-142-aging-engine` |
| Commit | Conventional Commits | `feat(finance): add aging brackets` |
| Migración | `NNNN_verbo_objeto.sql` por schema | `0042_add_fund_to_ledger_entries.sql` |

**Corrección respecto de v1.0.** El ambiente se elimina del nombre de colas y buses: los ambientes se separan por cuenta (§8.4), y embeber el entorno en el nombre del recurso acopla el contrato al entorno y complica la promoción. El estilo `POST /recurso/{id}:accion` se sustituye por sub-recurso `actions` para evitar incompatibilidades con proxies y generadores de cliente.

### 14.2 Modelo de datos

**Columnas obligatorias en toda tabla tenant-scoped**

| Columna | Tipo | Nota |
|---|---|---|
| `id` | `uuid` (v7 preferido) | Ordenable temporalmente, mejor localidad de índice |
| `tenant_id` | `uuid` NOT NULL | Eje de aislamiento |
| `property_global_id` | `uuid` | En entidades del expediente del condominio (§5.3) |
| `created_at` / `updated_at` | `timestamptz` | UTC |
| `created_by` / `updated_by` | `uuid` | Actor, no proceso genérico |
| `row_version` | `integer` | Concurrencia optimista |

**Reglas**

- Fechas y horas: `timestamptz` siempre, almacenadas en UTC. La zona horaria del tenant se aplica solo en presentación y en el cálculo de cortes de negocio, usando la zona declarada del tenant.
- Dinero y participación: tipos de §9.5. Prohibido punto flotante, verificado en CI.
- **Borrado**: prohibido el borrado físico en entidades de negocio. Se usa `status` explícito o `archived_at`. El borrado físico ocurre únicamente por el proceso de disposición documental o por ejercicio de derechos, y produce certificado.
- Claves foráneas incluyen `tenant_id` cuando sea necesario para impedir referencias cruzadas.
- Enumeraciones de negocio se modelan como tabla de catálogo o tipo verificado, no como texto libre.

### 14.3 Contratos de API

| Aspecto | Regla |
|---|---|
| Errores | **RFC 9457 `application/problem+json`** con `type`, `title`, `status`, `detail`, `instance`, más `trace_id` y `error_code` estable del catálogo interno. Prohibido devolver mensajes de excepción crudos |
| Idempotencia | Cabecera `Idempotency-Key` obligatoria en todo `POST` no idempotente. Se almacena la respuesta original con TTL. Misma clave y mismo cuerpo → respuesta original; misma clave y cuerpo distinto → `422` |
| Paginación | Cursor por defecto: `cursor`, `limit`, `next_cursor`. Offset solo en listados administrativos acotados |
| Filtrado y orden | `filter[campo]`, `sort=-created_at`, con lista blanca de campos por recurso |
| Fechas | RFC 3339 en UTC: `2026-07-26T14:03:00Z` |
| Dinero | `{ "amount": "1234.5600", "currency": "PEN" }` — `amount` como **string decimal**, nunca número JSON |
| Versionado | Prefijo `/v1`; cambios incompatibles crean versión mayor |
| Deprecación | Soporte de `N-1` durante **mínimo 6 meses**; cabeceras `Deprecation` y `Sunset` (RFC 8594); registro en changelog |
| Correlación | Propagación W3C `traceparent`/`tracestate`; `X-Correlation-Id` de negocio, distinto del trace técnico |
| Rate limit | Cabeceras estándar de límite, restante y reinicio; límite por tenant y por usuario |

### 14.4 Contratos de eventos

- Envoltura CloudEvents con extensiones obligatorias: `tenantid`, `propertyid` (cuando aplique), `correlationid`, `causationid`, `dataclassification`, `schemaversion`.
- **Registro de esquemas**: JSON Schema versionado en `packages/contracts`, validado en CI tanto en el productor como en el consumidor.
- Compatibilidad hacia atrás obligatoria dentro de una versión mayor: solo adición de campos opcionales.
- Orden garantizado por clave de agregado, **no globalmente**. Los consumidores deben tolerar desorden entre agregados.
- Todo consumidor es idempotente y registra en `inbox` para deduplicación.

### 14.5 Almacenamiento de objetos

- Prefijo obligatorio: `tenant/{tenant_id}/{dominio}/{yyyy}/{mm}/{document_id}/{version}/{nombre_interno}`.
- El nombre interno es generado; el nombre original del usuario se conserva como metadato, nunca como ruta.
- Todo objeto lleva metadatos de tenant, clase documental, hash y política de retención.

### 14.6 Seguridad en el código

- Secretos exclusivamente desde el gestor de secretos; prohibidos en código, imágenes, variables no protegidas o logs.
- Toda entrada externa se valida contra un esquema; se rechazan campos desconocidos en interfaces críticas.
- Salidas de log sin PII ni payloads sensibles; redacción centralizada.
- Dependencias con versión bloqueada, SBOM y revisión de licencias.

---

## 15. Operación, soporte y onboarding

### 15.1 Modelo operativo

| Función | Responsabilidad |
|---|---|
| Product Owner | Prioridad, valor, aceptación de alcance y riesgo |
| Software Lead | Entrega técnica, decisiones y coordinación de ingeniería |
| SRE/DevSecOps | Plataforma, despliegue, SLO, backups, DR y FinOps |
| Security/Privacy | Riesgo, incidentes, controles, evaluaciones de impacto y cumplimiento |
| Customer Success | Onboarding, adopción, hypercare, renovación y feedback |
| Support | Triage, comunicación, workaround, seguimiento y escalamiento |
| Domain Owners | Runbooks, KPI, integridad y evolución de cada contexto |
| Legal externo | Validación de reglas, retención, firma, gates legales y contratos |
| Proveedor | SLA, soporte, seguridad, continuidad y exportabilidad contractual |

### 15.2 Severidad de incidentes

| Severidad | Ejemplos | Respuesta |
|---|---|---|
| SEV-1 | Fuga cross-tenant, pérdida de votos/pagos, ledger no balanceado, compromiso crítico, Assembly detenida sin contingencia | Respuesta inmediata 24/7, comando de incidente, contención, comunicación y postmortem |
| SEV-2 | Función crítica degradada, conciliación o cobranza detenida, invariante violada, múltiples tenants afectados | Atención prioritaria, actualizaciones periódicas y workaround |
| SEV-3 | Función no crítica afectada o error con alternativa | Atención en horario operativo y priorización |
| SEV-4 | Consulta, mejora o defecto cosmético | Backlog y SLA de soporte |

### 15.3 Runbooks obligatorios

- Despliegue y rollback.
- Falla de base de datos, colas, S3 y proveedor externo.
- Pago duplicado, webhook atrasado, conciliación detenida y archivo corrupto.
- **Invariante de ledger violada: contención, congelamiento de cierre, diagnóstico y corrección compensatoria.**
- Fuga cross-tenant o acceso privilegiado anómalo.
- **Brecha de datos personales**: evaluación, contención, preservación de evidencia, **notificación a la autoridad y a los titulares dentro del plazo regulatorio aplicable**, comunicación y postmortem. *(Los plazos exactos los fija Legal contra el reglamento vigente y se incorporan al runbook como reloj explícito.)*
- Restore de base y documentos; declaración de desastre regional.
- Assembly: pre-check, contingencia, suspensión, reanudación y cierre.
- **Traspaso de administración y offboarding de tenant.**
- Legal hold, exportación, derecho del titular y eliminación.
- Rotación de secretos, certificado, dominio y clave.
- Noisy neighbor, saturación y anomalía de costos.

### 15.4 Onboarding y hypercare

| Etapa | Salida |
|---|---|
| Discovery | Inventario de propiedades, usuarios, bancos, procesos, datos y módulos |
| Preparación | Plantillas, mappings, seguridad, roles, comunicación y plan de cambio |
| Carga | Staging, validación, reconciliación, saldos de apertura y acta |
| UAT | Casos por rol, excepciones, permisos, reportes y aceptación |
| Go-live | Feature flags, canales, soporte, dashboards y responsables |
| Hypercare | Seguimiento diario/semanal, defectos, adopción, costo y cierre formal |

### 15.5 Gestión del cambio y adopción

- Comunicar beneficios por rol, no solo funcionalidades.
- Capacitación breve basada en tareas; guías contextuales y datos de prueba.
- Adopción medida por uso real: **pagos, consultas de estado de cuenta, lecturas de rendición de cuentas**, tickets, reservas, visitas, OT y asambleas.
- Canal alternativo temporal para usuarios con baja madurez digital.
- No desactivar procesos anteriores hasta reconciliar datos y confirmar la nueva operación.
- Analizar abandono por pantalla, flujo, navegador, tenant y segmento.
- Usar pilotos pagados como evidencia de disposición a pagar, no solo entrevistas.

### 15.6 Gestión de release

| Tipo | Política |
|---|---|
| Normal | Ventana, pruebas, canary/blue-green, feature flag y monitoreo |
| Alto riesgo | Aprobación adicional, backup/restore validado, rollback y soporte reforzado |
| Emergency fix | Alcance mínimo, aprobación de incidente, pruebas esenciales y revisión posterior |
| Assembly freeze | Sin cambios funcionales 24 h antes del evento salvo emergencia |
| **Cierre contable** | **Sin despliegues que afecten Finance durante la ventana de cierre mensual del tenant** |
| Deprecation | Aviso, telemetría, migración, ventana de compatibilidad y retiro |
| Proveedor externo | Validar cambio de API, sandbox, contract test y fallback |

---

## 16. Gobierno de arquitectura e implementación

### 16.1 Architecture Decision Records

Todo cambio material en stack, proveedor, tenancy, datos, seguridad, SLO, retención o extracción de servicios requiere un ADR con contexto, opciones, decisión, consecuencias, riesgos, estado y fecha de revisión.

| ADR | Decisión | Estado |
|---|---|---|
| ADR-001 | Monolito modular y workers separados | Aceptada |
| ADR-002 | Bounded contexts y ownership de datos | Aceptada |
| ADR-003 | Tenant administradora, pool + RLS; bridge/silo Enterprise | Aceptada |
| ADR-004 | TypeScript + Node.js LTS + NestJS | Aceptada |
| ADR-005 | REST/OpenAPI y CloudEvents | Aceptada |
| **ADR-006** | RabbitMQ antes de Kafka | **Superada por ADR-006-R** |
| **ADR-006-R** | **Outbox + SQS/EventBridge en F1; broker dedicado solo con evidencia** | **Aceptada (v2.0)** |
| ADR-007 | Transactional Outbox e Inbox | Aceptada |
| ADR-008 | Event sourcing selectivo | Aceptada |
| ADR-009 | S3 Object Lock para evidencia final selectiva | Aceptada |
| ADR-010 | ECS Fargate antes de Kubernetes | Aceptada |
| ADR-011 | OpenTelemetry como estándar | Aceptada |
| ADR-012 | Cognito como IAM inicial | Aceptada, **con ensayo de portabilidad obligatorio** |
| ADR-013 | Mercado Pago principal; segundo proveedor planificado | Aceptada |
| ADR-014 | SES + FCM + WhatsApp add-on | Aceptada, **modelo de costo actualizado** |
| ADR-015 | IVS y proveedor acreditado de firma | Aceptada |
| ADR-016 | Matriz F0-F4 / E1-E4 y legal hold | Aceptada |
| ADR-017 | Conciliación determinista y formatos bancarios prioritarios | Aceptada |
| ADR-018 | Reservations/Front Desk por segmento y add-ons | Aceptada |
| ADR-019 | Maintenance antes de Assembly | Aceptada |
| ADR-020 | PWA-first y Gate nativo | Aceptada, **con paso intermedio evaluable** |
| ADR-021 | SLO, capacidad, DR y FinOps progresivos | Aceptada |
| ADR-022 | IA asistida, RAG y revisión humana | Aceptada |
| **ADR-023** | **Topología de cuentas AWS y separación de ambientes** | **Propuesta (F1)** |
| **ADR-024** | **Contrato de aislamiento RLS: FORCE RLS, roles, `SET LOCAL`, pooler y ORM** | **Propuesta (F1)** |
| **ADR-025** | **Representación de dinero y alícuotas; redondeo y residuo** | **Propuesta (F1)** |
| **ADR-026** | **Modelo de errores de API (RFC 9457) y catálogo de códigos** | **Propuesta (F1)** |
| **ADR-027** | **Contrato de idempotencia** | **Propuesta (F1)** |
| **ADR-028** | **Fecha, hora y zona horaria; cortes de periodo y ventanas de asamblea** | **Propuesta (F1)** |
| **ADR-029** | **Concurrencia de reservas por restricción de exclusión** | **Propuesta (F2)** |
| **ADR-030** | **Borrado, anonimización y offboarding de tenant** | **Propuesta (F1)** |
| **ADR-031** | **Identidad global de propiedad y traspaso de administración** | **Propuesta (F1)** |
| **ADR-032** | **Medios de pago locales: billeteras interoperables, efectivo y adquirentes** | **Propuesta (F1)** |
| **ADR-033** | **Comprobantes electrónicos y alcance tributario** | **Propuesta (F1)** |
| **ADR-034** | **Cadena responsable/encargado y modelo de DPA** | **Propuesta (F1)** |
| **ADR-035** | **Verificabilidad del voto: recibo, encadenamiento y raíz publicada** | **Propuesta (F4)** |
| **ADR-036** | **Assembly como unidad de despliegue separada** | **Propuesta (F4)** |
| **ADR-037** | **Registro de esquemas de eventos y política de compatibilidad** | **Propuesta (F1)** |
| **ADR-038** | **Enforcement automatizado de fronteras modulares** | **Propuesta (F1)** |
| **ADR-039** | **Fondos, presupuesto multi-fondo y modelo de egresos** | **Propuesta (F2)** |
| **ADR-040** | **Medición de consumo y facturación del servicio** | **Propuesta (F1)** |

### 16.2 Proceso de excepción

1. Identificar el requisito, principio o decisión que no puede cumplirse.
2. Describir necesidad, alcance, alternativas y evidencia.
3. Evaluar impacto en seguridad, datos, operación, costo y roadmap.
4. Definir controles compensatorios, propietario y **fecha de expiración**.
5. Obtener aprobación del Software Architect y de los dueños de riesgo pertinentes.
6. Registrar ADR o aceptación de riesgo y revisar antes de su vencimiento.

Una excepción sin fecha de expiración se rechaza. Una excepción vencida y no renovada se considera un defecto.

### 16.3 Equipo recomendado por fase

| Fase | Roles mínimos |
|---|---|
| F1 | Product Owner, Software Lead/Architect, 2-3 full-stack, QA automation, UX, **DevOps/SRE con dedicación real y no residual**, Compliance part-time, Customer Success |
| F1.5 | Equipo F1 + refuerzo de soporte y operación de datos |
| F2 | Equipo F1.5 + capacidad para Finance de egresos y Operations |
| F3 | Squad Core/Finance, squad Operations/Maintenance, Platform/SRE, QA/Security y BI |
| F4 | Equipo Governance dedicado durante eventos, Legal/Compliance y SRE de guardia |
| F5 | Data/ML, Marketplace/Integraciones y Security/Privacy dedicado |
| F6 | Equipos por dominio extraído, SRE, soporte Enterprise y gestión de proveedores |

**Nota crítica.** La Fase 1 incorpora la capacidad de plataforma (§5.14) al alcance planificado. Un rol de DevOps *part-time* nominal es incompatible con las salidas exigidas por ARG-2; si no se dispone de esa capacidad, el alcance de F1 debe recortarse en consecuencia (P-17).

### 16.4 Artefactos de ingeniería obligatorios

| Artefacto | Contenido |
|---|---|
| C4 Context/Container/Component | Personas, sistemas, unidades de despliegue y componentes |
| Modelo de dominio | Entidades, estados, invariantes, ownership y lenguaje ubicuo |
| OpenAPI / AsyncAPI y JSON Schema | Contratos versionados y ejemplos |
| Modelo de datos | Tablas, claves, RLS, índices, clasificación y retención |
| Threat model | Activos, actores, fronteras, amenazas, controles y riesgos |
| ADR | Decisiones materiales y consecuencias |
| Test strategy | Pirámide, riesgos, ambientes, datos y criterios |
| **Catálogo de invariantes** | **Invariante, alcance, frecuencia, mecanismo y severidad ante violación** |
| Runbooks | Operación, fallos, recuperación y soporte |
| SLO dashboard | SLI, presupuesto de error y alertas |
| Capacity & cost model | Carga, headroom, unit economics y límites |
| Privacy / retention matrix | Finalidad, base, destinatarios, conservación, firma, evidencia y **fundamento** |
| Release plan | Feature flags, migrations, rollback, soporte y comunicación |

### 16.5 Códigos, capas y familias

Para evitar la ambigüedad detectada en la línea base anterior:

- `PLT`, `CORE`, `OPS`, `GOV`, `ECO`, `ENT` son **familias de servicio**, no capas.
- La **capa** (`L1…L6`) y la **fase** (`F1…F6`) son metadatos explícitos de cada servicio y de cada épica, gestionados en el issue tracker.
- El código de servicio y de épica es **inmutable** una vez publicado; un cambio de capa o de fase modifica el metadato, nunca el código.
- Convención de épica: `EPC-<FAMILIA>-<NN>-<SS>`, donde `<FAMILIA>-<NN>` reproduce el código del servicio propietario.

### 16.6 Trazabilidad obligatoria (nuevo en v2.0)

Toda épica del backlog declara, como campos estructurados y no como prosa:

| Campo | Contenido |
|---|---|
| `service_owner`, `layer`, `phase` | Propiedad y ubicación en el plan |
| `nfr_refs` | Identificadores del Anexo A |
| `adr_refs` | ADR que la condicionan |
| `risk_refs` | Riesgos del Anexo C que mitiga o introduce |
| `data_classification` | Clase de datos que trata |
| `signature_level` / `evidence_level` | Cuando produzca documentos o evidencia |
| `gate` | Gate al que contribuye |
| `outcome_metric` | Métrica primaria de éxito con línea base y objetivo |
| `invariants` | Invariantes que debe preservar |

Cadena completa: `Product Goal → fase → servicio → épica → PBI → task/PR → prueba → release → KPI`.

Sin estos campos, una épica no puede pasar a estado *Ordered*.

### 16.7 Evidence pack de gate

Cada gate cierra con un paquete **generado**, no redactado:

| Sección | Fuente |
|---|---|
| Épicas comprometidas y su estado | Issue tracker filtrado por `gate` |
| NFR verificados | Matriz `nfr_refs` × resultado de prueba en CI |
| Invariantes verificadas y su histórico de violaciones | Catálogo de invariantes + alertas |
| ADR aprobados o en excepción, con vencimientos | Repositorio de ADR |
| Riesgos abiertos con tratamiento y dueño | Registro de riesgos |
| Resultado del último restore **verificado** | Pipeline de DR |
| SLO y consumo de presupuesto de error (90 días) | Dashboard de SLO |
| Prueba negativa cross-tenant | Reporte del pipeline |
| Costo unitario por tenant y propiedad | Reporte FinOps |
| Hallazgos de seguridad abiertos por severidad | SAST/DAST/pentest |
| Gates legales aplicables | Registro de Legal/Compliance |
| Firma de aprobadores | Documents & Evidence de la propia plataforma |

### 16.8 Definition of Ready arquitectónica

- Persona, problema, resultado esperado y **métrica con línea base** definidos.
- Tenant scope, roles, datos, clasificación, retención y auditoría identificados.
- Flujos normal, alterno, error, reintento y recuperación descritos.
- Dependencias, contratos y proveedor evaluados.
- NFR, SLO, **invariantes** y volumen estimado definidos.
- Revisión de amenazas y privacidad completada según riesgo.
- Estrategia de prueba, migración, feature flag y observabilidad acordada.
- Costo variable, `metering_key` y entitlement definidos cuando aplique.
- Tamaño compatible con la regla de §4.4.

### 16.9 Definition of Done

- Criterios funcionales y no funcionales verificados.
- Pruebas unitarias, integración, contrato, E2E, **invariantes** y seguridad aprobadas.
- Telemetría, alertas y dashboard disponibles.
- **RLS forzado y prueba negativa cross-tenant generada, aprobadas.**
- Migración, rollback y feature flag probados.
- Documentación, runbook, soporte y capacitación actualizados.
- Costos y consumo medibles por servicio y tenant.
- Sin vulnerabilidades críticas ni riesgos sin aceptación.
- Evidencia de aprobación y release registrada.

### 16.10 Calibración 30/60/90

| Periodo | Acciones |
|---|---|
| Día 0-30 | Línea base de carga, errores, latencias, costos, adopción, calidad de datos y proveedores |
| Día 31-60 | Ajustar autoscaling, pools, queries, índices, workers, retención y noisy neighbors; **ejecutar restore verificado**; ensayo de portabilidad IAM |
| Día 61-90 | Prueba 2x, fallas, rollback, SLO, costo unitario, RPO/RTO, seguridad y caso de GA |
| Gate GA | No aprobar sin restore verificado, capacidad, soporte, aislamiento probado, costo sostenible, runbooks y gates legales cerrados |

### 16.11 Métricas de éxito del producto

| Resultado | Indicador |
|---|---|
| Menor carga administrativa | Horas por propiedad y unidades por colaborador |
| **Mejor cobranza** | **% cobrado dentro del periodo, aging por tramo y efectividad de la escalera** |
| Menor conciliación manual | % automático, excepciones y tiempo de cierre |
| **Mayor transparencia** | **% de condominios con rendición de cuentas publicada en plazo; lecturas por propietario** |
| Mejor atención | Tickets/OT dentro de SLA, backlog y reincidencia |
| Mejor operación | Preventivo/correctivo, evidencia de cierre y desempeño de proveedores |
| Mejor gobernanza | Participación, quorum, tiempo de acta y cero discrepancias |
| **Continuidad** | **% de condominios retenidos ante cambio de administradora** |
| Adopción | MAU/usuarios habilitados, frecuencia por rol y tasa de instalación de PWA |
| Rentabilidad | Costo por propiedad, **margen por add-on con consumo medido** y MRR |
| Confiabilidad | SLO, presupuesto de error, restore verificado y defectos de integridad |

---

## Anexo A. Matriz de requisitos no funcionales

| ID | Categoría | Requisito | Verificación | Fase |
|---|---|---|---|---|
| NFR-SEC-01 | Aislamiento | Ninguna operación cross-tenant no autorizada | **Prueba negativa generada sobre catálogo completo** + pentest | F1 |
| NFR-SEC-02 | MFA | Administradores, juntas y privilegiados usan MFA/step-up | Pruebas IAM/auditoría | F1 |
| NFR-SEC-03 | Secretos | Ningún secreto en código, log o imagen | Secret scan y revisión | F1 |
| **NFR-SEC-04** | **RLS forzado** | **100 % de tablas tenant-scoped con `FORCE ROW LEVEL SECURITY` y rol de aplicación sin `BYPASSRLS`** | **Consulta al catálogo en CI** | **F1** |
| **NFR-SEC-05** | **Cuentas** | **Ningún principal de no-producción puede asumir roles en producción** | **Policy-as-code y revisión de accesos** | **F1** |
| NFR-REL-01 | Disponibilidad T1 | 99.9 % mensual | SLO dashboard | F1/GA |
| NFR-REL-02 | Assembly | 99.95 % en ventana crítica | Dashboard/event report | F4 |
| NFR-PERF-01 | Latencia | Lecturas comunes p95 ≤700 ms; escrituras ≤1 s | Load/RUM | F1 |
| NFR-PERF-02 | Voto | Confirmación p95 ≤700 ms y quorum ≤2 s | Load test | F4 |
| **NFR-PERF-03** | **Cobranza** | **Corrida de aging y escalera sobre la envolvente de capacidad dentro de la ventana operativa acordada** | **Load test de corrida** | **F1** |
| NFR-DATA-01 | RPO/RTO regional | T1 dentro de región ≤5 min/≤30 min según escenario | Restore/failover | F1+ |
| NFR-DATA-02 | DR estándar | Región ≤24 h/≤8 h | Ejercicio regional | GA |
| **NFR-DATA-03** | **Restore verificado** | **Todo restore de prueba arranca la aplicación, cuadra el ledger y valida hashes** | **Pipeline de DR con evidencia** | **F1** |
| NFR-AUD-01 | Auditoría | 100 % de acciones críticas con actor, tiempo, tenant y resultado | Audit review | F1 |
| NFR-ACC-01 | Accesibilidad | WCAG 2.2 AA en flujos críticos | Automática + manual | F1 |
| NFR-OPS-01 | Observabilidad | Traces, metrics y logs correlacionados con `tenant_id` | Coverage dashboard | F1 |
| **NFR-OPS-02** | **Sintéticas** | **Recorridos críticos verificados desde fuera con alerta ante fallo** | **Monitoreo sintético** | **F1** |
| NFR-INT-01 | Idempotencia | Pagos, votos, reservas, archivos y webhooks reintentables | Retry/chaos tests | F1+ |
| NFR-PRV-01 | Privacidad | Inventario, finalidad, retención, transferencias y derechos | Privacy review + GL-1 | F1 |
| **NFR-PRV-02** | **Offboarding** | **Exportación completa y certificado de disposición disponibles desde el primer contrato** | **Ensayo documentado** | **F1** |
| NFR-MNT-01 | Deploy | Rollback y feature flags para cambios de riesgo | Release test | F1 |
| **NFR-MNT-02** | **Modularidad** | **Cero violaciones de frontera modular en `main`** | **Análisis de dependencias bloqueante** | **F1** |
| NFR-SCL-01 | Escala | 2x del pico con headroom y ruta 10x sin rediseño de dominios | Capacity test/model | GA |
| NFR-DOC-01 | WORM | Actas y evidencias finales no sobrescribibles | Object Lock test | F4 |
| NFR-FIN-01 | Ledger | Cero movimientos no balanceados o editados | Invariant tests/audit | F1 |
| **NFR-FIN-02** | **Tipos monetarios** | **Cero columnas monetarias o de alícuota en punto flotante** | **Consulta al catálogo en CI** | **F1** |
| **NFR-FIN-03** | **Alícuotas** | **Cero propiedades con suma de alícuotas fuera de tolerancia declarada** | **Invariante continua** | **F1** |
| NFR-COST-01 | Costo | AWS base ≤8 % MRR en GA | FinOps report | GA |
| **NFR-COST-02** | **Medición** | **100 % de add-ons con costo variable tienen consumo medido y conciliado** | **Reporte de metering vs. factura del proveedor** | **F2** |
| NFR-PWA-01 | Offline | Comandos permitidos no se pierden y se sincronizan idempotentemente | Device/network tests | F2/F3 |
| **NFR-PWA-02** | **Canal** | **Ninguna comunicación crítica depende exclusivamente de push** | **Prueba de matriz de canales** | **F1** |
| **NFR-GOV-01** | **Verificabilidad del voto** | **100 % de puntos de agenda con cadena de hashes íntegra y raíz publicada en el acta** | **Verificación automatizada post-asamblea** | **F4** |
| **NFR-CONT-01** | **Continuidad** | **Un traspaso de administración conserva el 100 % del expediente sin pérdida ni duplicación** | **Ensayo de traspaso con verificación de hashes** | **F2** |

## Anexo B. Metadatos obligatorios

| Objeto | Metadatos mínimos |
|---|---|
| Request | `trace_id`, `correlation_id`, `subject_id`, `tenant_id`, `property_id`, `operation`, `client_version`, `assurance_level` |
| Event | `id`, `type`, `source`, `time`, `tenant_id`, `property_global_id`, `correlation_id`, `causation_id`, `schema_version`, `data_classification` |
| Audit | actor, rol, tenant, acción, recurso, hash antes/después, resultado, IP/dispositivo, motivo |
| Document | tenant, clase, `owner_domain`, versión, hash, `retention_rule`, **`retention_basis`**, `legal_hold`, firmante, origen, `authoritative_copy` |
| Ledger entry | tenant, `property_global_id`, fondo, cuenta, importe, moneda, contrapartida, periodo, origen, evidencia, hash de cierre |
| **Expense** | **tenant, propiedad, fondo, categoría, proveedor, documento de respaldo, aprobador, fecha, importe, moneda** |
| Model run | modelo/versión, plantilla de prompt, fuentes, clasificación de entrada, hash de salida, revisor, decisión y feedback |
| Import batch | tenant, conector, cuenta, hash del archivo, versión de parser/mapping, totales de filas, resultado y aprobador |
| Payment | orden interna, transacción del proveedor, cuenta del tenant, importe/moneda, estado, idempotencia, evidencia |
| Work order | activo, origen, prioridad, SLA, responsable/proveedor, estado, costo, evidencia y aceptación |
| Vote | asamblea, punto de agenda, sujeto/representación, opción/token, nonce, idempotencia, timestamp del servidor, **hash del registro y hash previo de la cadena** |
| **Usage record** | **tenant, propiedad, `metering_key`, cantidad, unidad, periodo, proveedor, costo estimado y referencia de conciliación** |
| **Tenant link** | **`property_global_id`, `tenant_id`, fecha de inicio, fecha de fin, contrato, motivo, autorizadores** |

## Anexo C. Riesgos principales

| ID | Riesgo | Prob. | Impacto | Tratamiento |
|---|---|---|---|---|
| R-01 | Sobrediseño distribuido | Media | Alta | Monolito modular, criterios de extracción y TCO |
| R-02 | Fuga cross-tenant | Baja/Media | Crítica | RLS forzado, roles segregados, `SET LOCAL`, pruebas generadas, pentest y break-glass |
| R-03 | Reglas legales incorrectas | Media | Crítica | Legal owner, versionado, simulación, auditoría y gates legales GL-1 a GL-4 |
| R-04 | Pérdida/duplicación de pagos o votos | Baja | Crítica | Idempotencia, restricciones, outbox/inbox, conciliación, invariantes y event sourcing selectivo |
| R-05 | Dependencia de proveedores | Media | Alta | Adaptadores, SLA, fallback, exportación, segundo proveedor y **ensayo de portabilidad** |
| R-06 | Costos de video/mensajería/firma/IA | Alta | Alta | Medición por `metering_key`, add-ons, cuotas, topes y feature gates |
| R-07 | Baja adopción | Media | Alta | PWA simple, onboarding, fallback multicanal, analítica y **decisión de canal basada en evidencia del piloto** |
| R-08 | Datos iniciales deficientes | Alta | Alta | **Servicio dedicado de onboarding (D20)**, staging, validaciones, preview, acta y reconciliación |
| R-09 | Deuda técnica | Alta | Media/Alta | Quality gates, ADR, asignación de capacidad, **F1.5 de consolidación** y métricas |
| R-10 | PWA insuficiente para operación | Media | Media | Telemetría, offline controlado, limitaciones documentadas y Gate nativo |
| R-11 | DR no probado | Media | Crítica | **Restore verificado**, ejercicios programados y bóveda inmutable |
| R-12 | Marketplace sin liquidez | Alta | Media | Primero proveedores/RFQ y volumen interno |
| R-13 | IA incorrecta o exfiltración | Media | Alta | RAG autorizado, revisión humana, red teaming y DPA |
| R-14 | Integración física insegura | Media | Crítica | Gateway, segmentación, fabricante soportado y add-on especializado |
| **R-15** | **Pérdida comercial por ausencia de app nativa** | **Media** | **Media** | **Medición de tasa de instalación de PWA; empaquetado como paso intermedio reversible; Gate económico** |
| **R-16** | **Pérdida del condominio al cambiar de administradora** | **Alta** | **Alta** | **Identidad global de propiedad, proceso de traspaso, titularidad contractual del expediente (P-16)** |
| **R-17** | **Sobrecompromiso de alcance frente a capacidad** | **Alta** | **Alta** | **Modelo de capacidad publicado, regla de tamaño de épica, recorte de alcance antes que de calidad (P-17)** |
| **R-18** | **Margen desconocido por add-ons no medidos** | **Alta** | **Media/Alta** | **`metering_key` obligatorio antes de activación comercial; conciliación contra factura del proveedor** |
| **R-19** | **Obligación tributaria descubierta tarde** | **Media** | **Alta** | **Gate legal GL-2 previo a la fijación de precios; adaptador de comprobantes electrónicos** |
| **R-20** | **Erosión de la modularidad del monolito** | **Alta** | **Alta** | **Enforcement automatizado de fronteras en CI; revisión de dependencias en cada Gate** |

## Anexo D. Catálogo de invariantes (nuevo en v2.0)

Toda invariante tiene mecanismo, frecuencia, severidad y dueño. Una invariante sin mecanismo automatizado no es una invariante.

| ID | Invariante | Mecanismo | Frecuencia | Severidad |
|---|---|---|---|---|
| INV-01 | Ninguna consulta devuelve filas de otro tenant | Prueba generada sobre catálogo + RLS forzado | Cada build | SEV-1 |
| INV-02 | `Σ débitos = Σ créditos` por tenant, propiedad, fondo y periodo | Consulta programada | Continua y al cierre | SEV-2 |
| INV-03 | `snapshot_saldo == Σ movimientos` | Job diario | Diaria | SEV-2 |
| INV-04 | Ningún asiento confirmado modificado o eliminado | Trigger + auditoría | Continua | SEV-1 |
| INV-05 | Suma de alícuotas por propiedad dentro de tolerancia declarada | Validación en escritura + job | Escritura y diaria | SEV-2 |
| INV-06 | Un voto por votante representado y punto de agenda | Restricción única + cadena de hashes | Escritura | SEV-1 |
| INV-07 | Cadena de hashes de votos íntegra por punto de agenda | Verificación post-cierre | Por asamblea | SEV-1 |
| INV-08 | Ningún pago aplicado dos veces | Restricción de idempotencia + conciliación | Continua | SEV-1 |
| INV-09 | Ningún movimiento entre fondos sin asiento autorizado | Validación + auditoría | Continua | SEV-2 |
| INV-10 | Ningún recordatorio de cobranza a unidad sin deuda | Verificación previa al envío + auditoría | Por corrida | SEV-3 |
| INV-11 | Ningún documento con legal hold eliminado | Bloqueo en disposición + auditoría | Continua | SEV-1 |
| INV-12 | Ninguna columna monetaria o de alícuota en punto flotante | Consulta al catálogo | Cada build | Bloqueo de build |
| INV-13 | Toda tabla tenant-scoped con `tenant_id`, RLS y `FORCE` | Consulta al catálogo | Cada build | Bloqueo de build |
| INV-14 | Cero violaciones de frontera modular en `main` | Análisis de dependencias | Cada build | Bloqueo de build |
| INV-15 | Un solo `property_tenant_link` activo por propiedad | Restricción parcial única | Escritura | SEV-2 |

## Anexo E. Glosario

| Término | Definición |
|---|---|
| ABAC | Control de acceso basado en atributos |
| ADR | Architecture Decision Record |
| BFF | Backend for Frontend |
| Bounded Context | Frontera semántica y de ownership de un dominio |
| CloudEvents | Formato estándar de envoltura de eventos |
| Custodio | Titular del expediente del condominio, por defecto la junta de propietarios |
| DPA | Acuerdo de tratamiento de datos entre responsable y encargado |
| DPIA | Evaluación de impacto en la protección de datos |
| Dunning | Escalera de recordatorios y gestión progresiva de la deuda |
| Event Sourcing | Persistencia de cambios como secuencia de eventos inmutables |
| Feature entitlement | Derecho contractual/técnico de un tenant o propiedad a usar una capacidad |
| FORCE RLS | Modo de PostgreSQL que aplica las políticas de seguridad de fila también al propietario de la tabla |
| Idempotencia | Repetir una operación sin duplicar su efecto |
| Inbox/Outbox | Patrones de publicación transaccional y deduplicación |
| Invariante | Condición que el sistema garantiza siempre y verifica automáticamente |
| IOFE | Infraestructura Oficial de Firma Electrónica |
| Legal hold | Bloqueo de eliminación asociado a investigación u obligación |
| MAU | Usuarios activos mensuales |
| Metering key | Identificador de la unidad de consumo medible de una capacidad facturable |
| Multi-tenancy | Una plataforma sirve a múltiples organizaciones aisladas |
| `property_global_id` | Identificador estable del condominio, independiente del tenant que lo administra |
| PWA | Progressive Web App |
| RAG | Generación aumentada por recuperación |
| RLS | Row-Level Security de PostgreSQL |
| RPO / RTO | Pérdida de datos tolerable / tiempo objetivo de recuperación |
| Saga | Secuencia de transacciones locales con compensaciones |
| SLI/SLO/SLA | Indicador, objetivo interno y compromiso contractual de nivel de servicio |
| Vault Lock | Bloqueo de bóveda de respaldo que impide su alteración o eliminación durante el periodo declarado |
| WORM | Write Once Read Many; objeto no sobrescribible durante la retención |

## Anexo F. Referencias normativas y técnicas

| ID | Referencia | Fuente |
|---|---|---|
| R01 | AWS Well-Architected SaaS Lens | https://docs.aws.amazon.com/wellarchitected/latest/saas-lens/saas-lens.html |
| R02 | AWS SaaS Lens — Tenant isolation | https://docs.aws.amazon.com/wellarchitected/latest/saas-lens/tenant-isolation.html |
| R03 | Node.js release schedule | https://nodejs.org/en/about/previous-releases |
| R04 | NestJS OpenAPI | https://docs.nestjs.com/openapi/introduction |
| R05 | PostgreSQL Row Security Policies | https://www.postgresql.org/docs/current/ddl-rowsecurity.html |
| **R05b** | **PostgreSQL — restricciones de exclusión y `btree_gist`** | https://www.postgresql.org/docs/current/ddl-constraints.html |
| R06 | CloudEvents | https://cloudevents.io/ |
| R07 | OpenTelemetry Documentation | https://opentelemetry.io/docs/ |
| **R07b** | **OpenTelemetry Semantic Conventions** | https://opentelemetry.io/docs/specs/semconv/ |
| R08 | OWASP ASVS | https://owasp.org/www-project-application-security-verification-standard/ |
| R09 | OWASP MASVS | https://mas.owasp.org/MASVS/ |
| R10 | NIST SP 800-207 Zero Trust Architecture | https://csrc.nist.gov/pubs/sp/800/207/final |
| R11 | WCAG 2.2 | https://www.w3.org/TR/WCAG22/ |
| **R11b** | **RFC 9457 — Problem Details for HTTP APIs** | https://www.rfc-editor.org/rfc/rfc9457 |
| **R11c** | **RFC 8594 — The Sunset HTTP Header Field** | https://www.rfc-editor.org/rfc/rfc8594 |
| **R11d** | **RFC 3339 — Date and Time on the Internet** | https://www.rfc-editor.org/rfc/rfc3339 |
| **R11e** | **W3C Trace Context** | https://www.w3.org/TR/trace-context/ |
| R12 | Amazon Cognito | https://aws.amazon.com/cognito/pricing/ |
| R13 | Amazon RDS Multi-AZ | https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.MultiAZ.html |
| R14 | Amazon S3 Object Lock | https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock.html |
| **R14b** | **AWS Backup Vault Lock** | https://docs.aws.amazon.com/aws-backup/latest/devguide/vault-lock.html |
| **R14c** | **Amazon SQS / Amazon EventBridge** | https://docs.aws.amazon.com/sqs/ · https://docs.aws.amazon.com/eventbridge/ |
| R15 | Amazon SES | https://aws.amazon.com/ses/pricing/ |
| R16 | Firebase Cloud Messaging | https://firebase.google.com/pricing |
| R17 | Amazon IVS Real-Time Streaming | https://aws.amazon.com/ivs/features/real-time-streaming/ |
| R18 | Mercado Pago — documentación de desarrolladores | https://www.mercadopago.com.pe/developers |
| **R18b** | **WhatsApp Business Platform — tarifario por mensaje** | https://developers.facebook.com/docs/whatsapp/pricing |
| R20 | Prestadores de servicios de firma digital | https://www.gob.pe/59924-registro-oficial-de-prestadores-de-servicios-de-certificacion-oficial-rops |
| R22 | Ley N.º 27157 | https://www.gob.pe/institucion/congreso-de-la-republica/normas-legales/1792694-27157 |
| R23 | D.S. N.º 035-2006-VIVIENDA | https://www.gob.pe/institucion/minjus/normas-legales/1792695-035-2006-vivienda |
| R24 | Ley N.º 29733 | https://www.gob.pe/institucion/congreso-de-la-republica/normas-legales/243470-29733 |
| R25 | D.S. N.º 016-2024-JUS | https://www.gob.pe/institucion/anpd/normas-legales/6554453-16-2024-jus |
| R26 | Ley N.º 27269 | https://www.gob.pe/institucion/congreso-de-la-republica/normas-legales/292289-27269 |
| R27 | Ley N.º 29783 | https://www.gob.pe/institucion/congreso-de-la-republica/normas-legales/462576-29783 |
| **R28** | **SUNAT — comprobantes de pago electrónicos** | https://www.sunat.gob.pe |

*Las referencias se verifican en cada revisión de arquitectura. La contratación de proveedores, acreditaciones, precios, regiones y SLA se confirma mediante RFP, contrato y documentación vigente antes del go-live. Los tarifarios de proveedores cambian con frecuencia y no constituyen compromiso.*

## Anexo G. Aprobación de la línea base v2.0

Esta versión introduce cambios materiales respecto de v1.0 —fases, alcance de dominios, mensajería, tenancy y gates— y por tanto **requiere re-aprobación completa**, no una simple aceptación editorial.

| Rol | Nombre / responsable | Decisión | Fecha | Observaciones |
|---|---|---|---|---|
| Product Owner | ________________________ | Aprobado / Observado | ____/____/______ | |
| Software Architect / Software Lead | ________________________ | Aprobado / Observado | ____/____/______ | |
| Security / Privacy / Compliance | ________________________ | Aprobado / Observado | ____/____/______ | |
| Engineering / QA | ________________________ | Aprobado / Observado | ____/____/______ | |
| Operations / SRE | ________________________ | Aprobado / Observado | ____/____/______ | |
| Legal externo | ________________________ | Aprobado / Observado | ____/____/______ | |

**Decisiones que requieren pronunciamiento expreso en esta aprobación:**

1. Re-dimensionamiento de F1 e introducción de F1.5, con el desplazamiento de calendario que implica.
2. Adelanto de la cobranza avanzada a F1 y postergación de Visitor Parking y Access Integration.
3. Incorporación de egresos, fondos y rendición de cuentas al alcance de Finance (F2).
4. Creación de las capacidades Platform Runtime & Delivery, Onboarding & Migration y Subscription & Metering.
5. Sustitución del broker dedicado por outbox + SQS/EventBridge en F1 (ADR-006-R) y postergación de Redis.
6. Adopción de la identidad global de propiedad y del proceso de traspaso de administración (ADR-031).
7. Aceptación del guardrail de costo revisado.
8. Ejecución de los gates legales GL-1 a GL-4 como bloqueantes.

> **Control de cambios.** Tras la aprobación, todo cambio material se gestiona mediante ADR y una revisión controlada del documento. Las excepciones temporales deben tener propietario, controles compensatorios y fecha de vencimiento. Los documentos hijos —DOC-PROD-SVC-01, DOC-PROD-EPC-01 y DOC-SW-BLG-01— deben actualizarse en un plazo máximo de 15 días desde la aprobación de esta versión, e incorporar los tres servicios nuevos, la trazabilidad obligatoria de §16.6 y la corrección de gates de §4.3.

---

*SmartEdify · DOC-SW-ARCH-01 v2.0 · 26 de julio de 2026 · Uso interno / controlado*
