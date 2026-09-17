require('dotenv').config();

const http = require('http');
const app = require('./src/app');
const { initializeDatabase } = require('./src/db/init');
const createSocketServer = require('./src/socket');

async function start() {
  await initializeDatabase();

  const server = http.createServer(app);
  const io = createSocketServer(server);

  const port = Number(process.env.PORT || 4000);
  server.listen(port, () => {
    console.log(`Split backend running on http://localhost:${port}`);
  });

  app.locals.io = io;
}

start().catch((error) => {
  console.error('Failed to start Split server:', error);
  process.exit(1);
});
