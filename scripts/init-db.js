require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('../src/config/db');

async function run() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set. Export it before running npm run migrate.');
  }

  const schemaPath = path.join(__dirname, '..', 'src', 'db', 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  await db.query(schema);
  console.log('Database schema is up to date.');
  process.exit(0);
}

run().catch((error) => {
  console.error('Failed to initialize database schema:', error);
  process.exit(1);
});
