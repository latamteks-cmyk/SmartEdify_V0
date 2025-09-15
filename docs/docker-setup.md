# Configuración y arranque de persistencia SmartEdify

## Requisitos
- Docker y Docker Compose instalados
- Puertos libres host: 6380 (Redis), 5433 (Postgres)

## Arranque de servicios

1. Desde la raíz del proyecto, ejecuta:

```sh
# Levantar Redis y Postgres (incluye auth-service si se desea)
docker-compose up -d redis db
# o todo el stack
docker-compose up -d
```

2. Verifica que los contenedores estén corriendo:

```sh
docker ps
```

Deberías ver `smartedify-redis` y `smartedify-db` activos.

## Acceso a Redis
- Host (host machine): `localhost`
- Puerto host: `6380`
- Puerto contenedor interno: `6379`
- Variable env (servicios): `REDIS_HOST=redis` / `REDIS_PORT=6379`

## Acceso a Postgres
- Host (host machine): `localhost`
- Puerto host: `5433`
- Puerto contenedor interno: `5432`
- Usuario: `smartedify`
- Password: `smartedify`
- Base de datos: `smartedify`
- Variables env en servicios:
  - Interno: `DB_HOST=db` `DB_PORT=5432`
  - Host tooling local: `HOST_DB_HOST=localhost` `HOST_DB_PORT=5433`

## Volúmenes persistentes
- Redis: `redis_data`
- Postgres: `db_data`

## Comandos útiles

- Parar servicios:
  ```sh
  docker-compose down
  ```
- Ver logs:
  ```sh
  docker-compose logs redis
  docker-compose logs db
  ```
  - Healthcheck manual Postgres:
  ```sh
  docker exec smartedify-db pg_isready -U smartedify
  ```
  - Healthcheck manual Redis:
  ```sh
  docker exec smartedify-redis redis-cli PING
  ```
- Acceso a Postgres CLI:
  ```sh
  docker exec -it smartedify-db psql -U smartedify -d smartedify
  ```

## Notas
- Los datos se mantienen entre reinicios gracias a los volúmenes.
- No publiques `.env` con credenciales reales; usa placeholders y secrets en CI.
- Puedes modificar credenciales en `docker-compose.yml` y regenerar `.env.example`.

---
Para dudas o problemas, consulta la documentación oficial de Docker y Postgres.
