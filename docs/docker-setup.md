# Configuración y arranque de persistencia SmartEdify

## Requisitos
- Docker y Docker Compose instalados.
- Puertos libres en el host para Redis y Postgres (por defecto 6380 y 5433).
- Fichero `.env` creado a partir de `.env.example` con credenciales válidas (sustituye `CHANGE_ME_*`).

## Arranque rápido con Docker Compose
1. Desde la raíz del proyecto levanta los servicios base:
   ```sh
   docker compose up -d redis db
   # o todo el stack de servicios (añade APIs)
   docker compose up -d
   ```
2. Comprueba el estado:
   ```sh
   docker ps
   ```
   Deberías ver `smartedify-redis` y `smartedify-db` activos.

## Scripts de conveniencia (PowerShell)
`scripts/dev-up.ps1` automatiza la preparación del entorno en Windows (PowerShell 7+):
1. Carga variables desde `./.env`.
2. Levanta `db` y `redis` vía Docker Compose.
3. Valida healthchecks de contenedores.
4. Ejecuta la migración `001_create_auth_signing_keys.sql` si no se ha aplicado.
5. Exporta variables relevantes a la sesión actual.
6. Verifica que los puertos publicados en host coinciden con lo declarado en `.env` y muestra alertas si difieren.

Comandos habituales:
```powershell
# Arranque normal (usa .env existente)
pwsh -File scripts/dev-up.ps1

# Forzar recreación de contenedores cuando cambian puertos en .env
pwsh -File scripts/dev-up.ps1 -Recreate

# Reconstruir imágenes sin caché y recrear
pwsh -File scripts/dev-up.ps1 -Rebuild -Recreate
```

Flags disponibles:
- `-Rebuild`: ejecuta `docker compose build --no-cache` antes del arranque.
- `-Recreate`: elimina contenedores `db` y `redis` para respetar la configuración de puertos de `.env`.

## Variables de entorno y puertos
### Plantilla `.env`
- Copia `.env.example` a `.env` y sustituye `CHANGE_ME_*` por valores reales.
- `HOST_DB_PORT` corresponde al puerto publicado en el host; `DB_PORT` es el puerto interno del contenedor.

### Mapeo de puertos recomendado
| Servicio   | Puerto contenedor | Puerto host | Variable `.env` |
|------------|-------------------|-------------|-----------------|
| Postgres   | 5432              | 5433        | `PGPORT` / `HOST_DB_PORT` |
| Redis      | 6379              | 6380        | `REDIS_PORT` |
| Auth API   | 8080 (interno)    | 9080        | `AUTH_PORT` |
| User API   | 8081 (interno)    | 9081        | `USER_PORT` |

### Política de coherencia
- Si `PGPORT` (en `.env`) no coincide con el puerto publicado en Docker, `scripts/dev-up.ps1` mostrará un aviso `[ALERTA]` y no lo corregirá automáticamente. Ajusta `docker-compose.yml` para que use `${PGPORT}:5432`.
- El mismo criterio aplica para Redis (`REDIS_PORT`).

### Claves JWT
- Define `TENANT_JWT_PUBLIC_KEY` en tu `.env` con la clave pública (algoritmos soportados RS256, ES256, HS256).
- Nunca subas la clave privada al repositorio.

### Credenciales de base de datos
- Los valores por defecto de `docker-compose.yml` usan marcadores `CHANGE_ME_*`.
- Sustituye siempre por credenciales reales antes de exponer el entorno fuera de desarrollo.

## Comandos útiles de Docker
- Parar servicios:
  ```sh
  docker compose down
  ```
- Ver logs:
  ```sh
  docker compose logs redis
  docker compose logs db
  ```
- Healthcheck manual Postgres:
  ```sh
  docker exec smartedify-db pg_isready -U ${POSTGRES_USER}
  ```
- Healthcheck manual Redis:
  ```sh
  docker exec smartedify-redis redis-cli PING
  ```
- Acceso a Postgres CLI:
  ```sh
  docker exec -it smartedify-db psql -U ${POSTGRES_USER} -d ${POSTGRES_DB}
  ```

## Credenciales para publicar imágenes
Consulta [docs/docker-credenciales.md](docs/docker-credenciales.md) para instrucciones paso a paso sobre creación de PAT y autenticación en Docker Hub (o el registro que utilices).

## Volúmenes persistentes
- Redis: `redis_data`.
- Postgres: `db_data`.

## Resolución de problemas
- Los datos se preservan entre reinicios gracias a los volúmenes. Usa `docker compose down -v` si necesitas un entorno limpio.
- Comprueba que no exista otra instancia de Postgres/Redis utilizando los puertos definidos en `.env`.
- Para inspeccionar handles abiertos durante pruebas, utiliza `npx jest --selectProjects integration --detectOpenHandles` en auth-service.
