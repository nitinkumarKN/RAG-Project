import app from './app.js';
import { connectDatabase } from './config/db.js';
import { env } from './config/env.js';


async function startServer() {
  const mode = await connectDatabase();

 app.listen(env.port, () => {
  console.log(`Server running on port ${env.port}`);
  console.log(`Database mode: ${mode}`);
});
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
