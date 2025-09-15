require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.PGHOST || '127.0.0.1',
  port: Number(process.env.PGPORT) || 5432,
  user: 'smartedify',
  password: 'smartedify',
  database: process.env.PGDATABASE || 'smartedify',
});

pool.query('SELECT 1')
  .then(res => {
    console.log('Conexión exitosa:', res.rows);
    pool.end();
  })
  .catch(err => {
    console.error('Error de conexión:', err);
    pool.end();
  });
