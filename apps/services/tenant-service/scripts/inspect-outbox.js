// Usage: node scripts/inspect-outbox.js
// Prints columns of outbox tables and their existence.
const { Client } = require('pg');

(async () => {
  const url = process.env.TENANT_DB_URL;
  if (!url) {
    console.error('TENANT_DB_URL not set');
    process.exit(1);
  }
  const c = new Client({ connectionString: url });
  await c.connect();
  const tables = ['outbox_events', 'outbox_events_dlq'];
  for (const t of tables) {
    const exists = await c.query(
      `select to_regclass($1) as reg`, [t]
    );
    console.log(`Table ${t} exists:`, !!exists.rows[0].reg);
    if (exists.rows[0].reg) {
      const r = await c.query(`select column_name, data_type from information_schema.columns where table_name=$1 order by ordinal_position`, [t]);
      console.log(`${t} columns:`, r.rows);
    }
  }
  await c.end();
})().catch(e => { console.error(e); process.exit(1); });
