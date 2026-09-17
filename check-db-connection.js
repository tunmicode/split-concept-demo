require('dotenv').config();
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function main() {
  try {
    const result = await pool.query('SELECT current_database(), current_user, NOW()');
    console.log('DB connection successful.');
    console.log(result.rows[0]);
  } catch (error) {
    console.error('DB connection failed.');
    console.error(error.message);
    console.error('Full error object:');
    console.error(error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
