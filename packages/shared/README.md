# @smartedify/shared

Paquete de utilidades compartidas para los servicios de la plataforma SmartEdify. Proporciona helpers de tracing con OpenTelemetry, parseadores de variables de entorno basados en Zod, inicialización de métricas Prometheus, mocks reutilizables para Postgres/Redis, un wrapper de migraciones (`node-pg-migrate`) y tipos comunes de seguridad (JWT/JWKS).

## Casos de uso

- **Servicios Node.js** que requieren inicializar trazas, métricas o migraciones de base de datos de forma consistente.
- **Trabajos y scripts** que necesitan validar `process.env` de forma segura y tipada.
- **Suites de pruebas** que requieren dobles sencillos (mocks) de Postgres o Redis sin depender de infraestructura externa.
- **Servicios que validan tokens** con un contrato de tipos homogéneo para JWT y JWKS.

## Instalación en servicios

El repositorio se gestiona como monorepo de `npm`. Una vez ejecutado `npm install` en la raíz, el paquete queda disponible mediante workspaces. Desde cualquier servicio basta con declarar la dependencia en su `package.json`:

```json
{
  "dependencies": {
    "@smartedify/shared": "workspace:^"
  }
}
```

Tras instalar, importa los módulos deseados utilizando rutas esm:

```ts
import { initializeNodeTracing, parseEnv, initializePrometheusMetrics } from '@smartedify/shared';
```

## API principal

### Tracing (`src/tracing`)

- `initializeNodeTracing(options)` crea y registra un `NodeTracerProvider` con los exporters necesarios.

### Entorno (`src/env`)

- `parseEnv(schema, options)` valida `process.env` (o un origen personalizado) con Zod, soporta coerción y valores por defecto.
- `defineEnv(schema, options)` genera un cargador reutilizable con caché interno.

### Métricas (`src/metrics`)

- `initializePrometheusMetrics(options)` registra métricas por defecto y expone `registry`, `metrics()` y `reset()`.

### Mocks (`src/mocks`)

- `createPostgresMock()` expone un stub de consultas SQL con inspección de llamadas.
- `createRedisMock()` provee un almacen key/value en memoria con expiraciones básicas.

### Migraciones (`src/migrations`)

- `runMigrations(options)` ejecuta migraciones `node-pg-migrate` con logging opcional.
- `createMigrator(baseOptions)` devuelve helpers `up`, `down` y `run` reutilizables para scripts.

### Seguridad (`src/security`)

- Tipos `JwtRegisteredClaims`, `JwtPayload`, helpers `validateJwtPayload`, `createJwtPayload`, `audienceMatches`.
- Tipos `JsonWebKey`, `JsonWebKeySet` y utilidades `createJwks`, `findSigningKey`, `assertSigningKey`.

## Build & scripts

Dentro del paquete:

- `npm run build` compila a `dist/`.
- `npm run types` genera sólo declaraciones (`.d.ts`).
- `npm run lint` ejecuta las comprobaciones estáticas (delegado a `typecheck`).
- `npm run typecheck` realiza comprobación estricta con TypeScript sin emitir artefactos.

En CI se invocan los scripts de `lint` y `typecheck` para garantizar la calidad del paquete.
