import { Pool } from 'pg';

export default async function globalTeardown() {
  try {
    const pool = new Pool({
      host: process.env.PGHOST,
      port: Number(process.env.PGPORT),
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      database: process.env.PGDATABASE,
    });
    await pool.end();
  } catch (e) {
    // Silenciar
  }
}
