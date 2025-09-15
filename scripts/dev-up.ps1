param(
  [switch]$Rebuild,
  [switch]$Recreate
)

Set-StrictMode -Version 2
$ErrorActionPreference = 'Stop'

Write-Host "[dev-up] Fuente de verdad: .env" -ForegroundColor Cyan

$rootPath = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$envFile = Join-Path $rootPath '.env'
if (Test-Path $envFile) {
  Get-Content $envFile | ForEach-Object {
    if ($_ -match '^[A-Za-z_][A-Za-z0-9_]*=') {
      $parts = $_.Split('=',2)
      if ($parts.Length -eq 2) {
        $k = $parts[0]; $v = $parts[1]
        if ($k) { Set-Item -Path "Env:$k" -Value $v }
      }
    }
  }
  Write-Host "[dev-up] .env cargado" -ForegroundColor DarkGray
} else {
  Write-Host "[dev-up] NO existe .env" -ForegroundColor Yellow
}

if ($Rebuild) { docker compose build --no-cache }
if ($Recreate) { docker compose rm -fs db redis 1>$null 2>$null }

docker compose up -d db redis | Out-Null
if ($LASTEXITCODE -ne 0) { Write-Error "docker compose up fallo"; exit 1 }

Write-Host "[dev-up] Esperando healthchecks" -ForegroundColor Cyan
$maxWait = 120; $elapsed = 0
function Wait-Healthy($name) {
  docker inspect -f '{{.State.Health.Status}}' $name 2>$null
}
while ($elapsed -lt $maxWait) {
  $dbH = Wait-Healthy smartedify-db
  $rdH = Wait-Healthy smartedify-redis
  if ($dbH -eq 'healthy' -and $rdH -eq 'healthy') { break }
  Start-Sleep -Seconds 3; $elapsed += 3; Write-Host '.' -NoNewline
}
Write-Host ''
if ($elapsed -ge $maxWait) { Write-Error 'Timeout healthchecks'; exit 1 }
Write-Host '[dev-up] Dependencias OK' -ForegroundColor Green

$pgPort = $env:PGPORT; if (-not $pgPort) { $pgPort = '5542' }
$pgUser = $env:POSTGRES_USER; if (-not $pgUser) { $pgUser = 'CHANGE_ME_DB_USER' }
$pgDb = $env:POSTGRES_DB; if (-not $pgDb) { $pgDb = 'smartedify' }
$pgPwd = $env:POSTGRES_PASSWORD; if (-not $pgPwd) { $pgPwd = 'CHANGE_ME_DB_PASSWORD' }
$env:PGPASSWORD = $pgPwd

Write-Host "[dev-up] Verificando tabla auth_signing_keys" -ForegroundColor Cyan
$tries = 0
while ($tries -lt 20) {
  $ok = $false
  try {
  & psql -h localhost -p $pgPort -U $pgUser -d $pgDb -c "SELECT 1" -t | Out-Null
    if ($LASTEXITCODE -eq 0) { $ok = $true }
  } catch {}
  if ($ok) { break }
  Start-Sleep -Seconds 2; $tries++
}
if (-not $ok) { Write-Error "Postgres no responde en puerto $pgPort"; exit 1 }

$exists = & psql -h localhost -p $pgPort -U $pgUser -d $pgDb -t -A -c "SELECT to_regclass('public.auth_signing_keys') IS NOT NULL" 2>$null
if (-not ($exists -match "t")) {
  Write-Host "[dev-up] Aplicando migracion auth_signing_keys" -ForegroundColor Yellow
  $migrationPath = Join-Path $rootPath 'apps/services/auth-service/migrations/001_create_auth_signing_keys.sql'
  & psql -h localhost -p $pgPort -U $pgUser -d $pgDb -f $migrationPath
  if ($LASTEXITCODE -ne 0) { Write-Error "Migracion fallo"; exit 1 }
} else {
  Write-Host "[dev-up] Tabla existente" -ForegroundColor DarkGray
}

Set-Item Env:PGPORT $pgPort
Set-Item Env:PGHOST 'localhost'
Set-Item Env:PGUSER $pgUser
Set-Item Env:PGDATABASE $pgDb
Set-Item Env:REDIS_HOST 'localhost'
if (-not $env:REDIS_PORT -or [string]::IsNullOrWhiteSpace($env:REDIS_PORT)) { Set-Item Env:REDIS_PORT '6639' }
Write-Host "[dev-up] Variables exportadas" -ForegroundColor DarkGray

# Obtener puertos publicados usando 'docker port'
$pgHostPort = $pgPort
$pgMap = docker port smartedify-db 5432/tcp 2>$null
if ($pgMap) { $pgHostPort = ($pgMap -split ':' | Select-Object -Last 1) }
$redisHostPort = $env:REDIS_PORT
$redisMap = docker port smartedify-redis 6379/tcp 2>$null
if ($redisMap) { $redisHostPort = ($redisMap -split ':' | Select-Object -Last 1) }

Write-Host "[dev-up] Mapeo puertos:" -ForegroundColor Cyan
Write-Host ("  Postgres 5432 -> host {0} (env PGPORT={1})" -f $pgHostPort,$pgPort)
Write-Host ("  Redis    6379 -> host {0} (env REDIS_PORT={1})" -f $redisHostPort,$env:REDIS_PORT)
if ($pgHostPort -ne $pgPort) { Write-Host "[ALERTA] Postgres puerto host != .env PGPORT (usa -Recreate tras alinear compose)" -ForegroundColor Yellow }
if ($redisHostPort -ne $env:REDIS_PORT) { Write-Host "[ALERTA] Redis puerto host != .env REDIS_PORT" -ForegroundColor Yellow }

Write-Host "[dev-up] .env es la fuente de verdad. Flags: -Rebuild -Recreate" -ForegroundColor Cyan
Write-Host "[dev-up] Listo -> npm run build; node dist/cmd/server/main.js" -ForegroundColor Green