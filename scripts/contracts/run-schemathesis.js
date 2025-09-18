#!/usr/bin/env node

const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { setTimeout: delay } = require('node:timers/promises');

const rootDir = path.resolve(__dirname, '..', '..');

const schemathesisCmd = process.platform === 'win32' ? 'schemathesis.exe' : 'schemathesis';
const nodeCmd = process.execPath;

const scenarios = {
  auth: {
    name: 'auth-service',
    cwd: path.join(rootDir, 'apps/services/auth-service'),
    start: {
      command: nodeCmd,
      args: ['cmd/server/main.js'],
    },
    env: {
      NODE_ENV: 'test',
      SKIP_DB_TESTS: '1',
      AUTH_ADMIN_API_KEY: 'schemathesis-admin-key',
      AUTH_JWT_ACCESS_SECRET: 'schemathesis-access-secret',
      AUTH_JWT_REFRESH_SECRET: 'schemathesis-refresh-secret',
      AUTH_USER_SERVICE_MODE: 'mock',
      AUTH_PORT: '18080',
      PORT: '18080',
      PGHOST: '127.0.0.1',
      PGPORT: '65432',
      REDIS_HOST: '127.0.0.1',
      REDIS_PORT: '6655',
    },
    readinessUrl: 'http://127.0.0.1:18080/health',
    baseUrl: 'http://127.0.0.1:18080',
    specPath: path.join(rootDir, 'apps/services/auth-service/api/openapi.yaml'),
    reportFile: 'auth-service-schemathesis.xml',
    extraArgs: ['--endpoint=/health'],
  },
  tenant: {
    name: 'tenant-service',
    cwd: path.join(rootDir, 'apps/services/tenant-service'),
    start: {
      command: nodeCmd,
      args: [path.join('node_modules', 'tsx', 'dist', 'cli.js'), 'cmd/server/main.ts'],
      env: { TSX_TRANSPILE_ONLY: 'true' },
    },
    env: {
      NODE_ENV: 'test',
      SKIP_DB_TESTS: '1',
      TENANT_PORT: '18083',
      PGHOST: '127.0.0.1',
      PGPORT: '65433',
      POSTGRES_USER: 'postgres',
      POSTGRES_PASSWORD: 'postgres',
      POSTGRES_DB: 'schemathesis',
      TENANT_PUBLISHER: 'logging',
      TENANT_CONSUMER: 'none',
    },
    readinessUrl: 'http://127.0.0.1:18083/health',
    baseUrl: 'http://127.0.0.1:18083',
    specPath: path.join(rootDir, 'apps/services/tenant-service/api/openapi/tenant.yaml'),
    reportFile: 'tenant-service-schemathesis.xml',
    extraArgs: ['--endpoint=/health'],
  },
};

async function waitForService(url, timeoutMs = 30000, intervalMs = 500) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const controller = AbortSignal.timeout(2000);
      const response = await fetch(url, { signal: controller });
      if (response && response.status < 500) {
        return;
      }
    } catch (err) {
      // retry
    }
    await delay(intervalMs);
  }
  throw new Error(`Timeout esperando a que ${url} esté disponible`);
}

function spawnProcess(command, args, options, { fatal = false } = {}) {
  const child = spawn(command, args, options);
  child.on('error', error => {
    console.error(`[schemathesis] Falló el comando ${command}:`, error);
    if (fatal) {
      process.exit(1);
    }
  });
  return child;
}

async function run() {
  const target = process.argv[2];
  if (!target || !scenarios[target]) {
    console.error('Uso: node scripts/contracts/run-schemathesis.js <auth|tenant>');
    process.exit(1);
  }

  const scenario = scenarios[target];
  const env = { ...process.env, ...scenario.env };

  console.log(`[schemathesis] Iniciando ${scenario.name} en modo contrato...`);
  const startCommand = scenario.start?.command ?? nodeCmd;
  const startArgs = scenario.start?.args ?? ['cmd/server/main.js'];
  const serverEnv = { ...env, ...(scenario.start?.env ?? {}) };
  const server = spawnProcess(startCommand, startArgs, {
    cwd: scenario.cwd,
    env: serverEnv,
    stdio: 'inherit',
  }, { fatal: true });

  let serverExited = false;
  server.on('exit', code => {
    serverExited = true;
    if (code !== 0) {
      console.error(`[schemathesis] ${scenario.name} terminó con código ${code}`);
      process.exit(code ?? 1);
    }
  });

  const stopServer = () => {
    if (!server.killed && !serverExited) {
      server.kill('SIGTERM');
    }
  };

  const handleSignal = signal => {
    console.log(`[schemathesis] Recibida señal ${signal}, deteniendo servidor...`);
    stopServer();
    process.exit(1);
  };

  process.on('SIGINT', handleSignal);
  process.on('SIGTERM', handleSignal);

  try {
    await waitForService(scenario.readinessUrl);
  } catch (error) {
    console.error(`[schemathesis] No se pudo iniciar ${scenario.name}: ${error.message}`);
    stopServer();
    process.exit(1);
  }

  const reportDir = path.join(rootDir, 'reports', 'contracts');
  fs.mkdirSync(reportDir, { recursive: true });
  const reportPath = path.join(reportDir, scenario.reportFile);

  const schemathesisArgs = [
    'run',
    scenario.specPath,
    '--base-url',
    scenario.baseUrl,
    '--checks=not_a_server_error',
    '--junit-xml',
    reportPath,
    '--workers',
    '1',
    '--hypothesis-max-examples',
    '1',
    '--hypothesis-derandomize',
    ...scenario.extraArgs,
  ];

  console.log('[schemathesis] Ejecutando:', schemathesisCmd, schemathesisArgs.join(' '));
  const tester = spawnProcess(schemathesisCmd, schemathesisArgs, {
    cwd: rootDir,
    env: process.env,
    stdio: 'inherit',
  });

  tester.on('exit', code => {
    stopServer();
    if (code !== 0) {
      console.error(`[schemathesis] Schemathesis finalizó con código ${code}`);
    }
    process.exit(code ?? 1);
  });
}

run().catch(error => {
  console.error('[schemathesis] Error inesperado:', error);
  process.exit(1);
});
