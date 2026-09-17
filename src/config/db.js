const { Pool } = require('pg');

const APP_SCHEMA = 'split_demo';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

pool.on('connect', (client) => {
  client.query(`SET search_path TO ${APP_SCHEMA}`);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
  APP_SCHEMA,
};
