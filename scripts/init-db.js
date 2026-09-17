require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('../src/config/db');

async function run() {
  const schemaPath = path.join(__dirname, '..', 'src', 'db', 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  await db.query(schema);
  console.log('Database schema initialized successfully.');
  process.exit(0);
}

run().catch((error) => {
  console.error('Failed to initialize database schema:', error);
  process.exit(1);
});
