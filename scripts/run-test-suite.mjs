#!/usr/bin/env node
import { spawn } from 'node:child_process';

const VALID_SUITES = new Set(['all', 'fast', 'contract']);
const requestedSuite = process.argv[2];

if (!VALID_SUITES.has(requestedSuite)) {
  console.error('Usage: node scripts/run-test-suite.mjs <all|fast|contract>');
  process.exit(1);
}

const platformSuffix = process.platform === 'win32' ? 'win' : 'nix';
const scriptName = `test:${requestedSuite}:${platformSuffix}`;
const npmExecutable = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const child = spawn(npmExecutable, ['run', scriptName], {
  stdio: 'inherit',
  env: process.env,
});

child.on('error', (error) => {
  console.error(`[run-test-suite] Failed to start "${scriptName}":`, error);
  process.exit(1);
});

child.on('close', (code, signal) => {
  if (signal) {
    console.error(`[run-test-suite] Terminated by signal ${signal}`);
    process.exit(1);
  }

  process.exit(code ?? 1);
});
