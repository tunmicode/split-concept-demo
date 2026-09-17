const fs = require('fs');
const path = require('path');
const db = require('../config/db');

async function initializeDatabase() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  await db.query(schema);
  console.log('Database initialized in schema split_demo.');
}

module.exports = { initializeDatabase };
