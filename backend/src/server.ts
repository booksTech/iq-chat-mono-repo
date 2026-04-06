import http from 'http';
import { app } from './app.js';
import { connectDatabase } from './config/db.js';
import { env } from './config/env.js';
import { initSocket } from './socket/index.js';
import { ensureCollections } from './utils/ensureCollections.js';

async function bootstrap() {
  await connectDatabase();
  await ensureCollections();

  const server = http.createServer(app);
  initSocket(server);

  server.listen(env.PORT, () => {
    console.log(`Auth API running on http://localhost:${env.PORT}`);
  });
}

bootstrap().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
