import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

export default async function globalSetup() {
  const root = process.cwd();
  const envTestPath = path.join(root, '.env.test');
  if (fs.existsSync(envTestPath)) {
    dotenv.config({ path: envTestPath });
    // Re-export to process.env explicitly
    for (const line of fs.readFileSync(envTestPath,'utf-8').split(/\r?\n/)) {
      if (!line || line.startsWith('#')) continue;
      const idx = line.indexOf('=');
      if (idx === -1) continue;
      const k = line.substring(0, idx).trim();
      const v = line.substring(idx + 1).trim();
      if (k) process.env[k] = v;
    }
  }
  // Comprobar que existen tablas fundamentales; si falta alguna, correr migraciones
  const checkCmd = `node -e "(async()=>{const {Pool}=require('pg');const p=new Pool();const needed=['users','auth_signing_keys'];try{for (const t of needed){try{await p.query('SELECT 1 FROM ' + t + ' LIMIT 1');}catch(e){process.exit(2);}}}finally{await p.end();}})()"`;
  try {
    execSync(checkCmd, { stdio: 'ignore' });
  } catch (e: any) {
    if (e.status === 2) {
      try {
        execSync('npm run migrate --silent', { stdio: 'inherit' });
      } catch (mErr) {
        console.error('[global-setup] Error ejecutando migraciones:', (mErr as any).message);
        throw mErr;
      }
    } else {
      console.warn('[global-setup] Advertencia no esperada:', e.message);
    }
  }
}
