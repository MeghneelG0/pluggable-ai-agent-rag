import { Server } from '@/server';

async function main() {
  try {
    const server = new Server();
    await server.setup();
    await server.start();
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();