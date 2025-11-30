import env from './config/env';
import app from './app';

let server: any;

const start = async () => {
  server = app.listen(env.port, () => {
    console.log(`API server listening on port ${env.port}`);
  });
};

const shutdown = async (signal: string) => {
  console.log(`${signal} received. Starting graceful shutdown...`);

  if (server) {
    server.close(async () => {
      console.log('HTTP server closed');

      // Close database connection
      try {
        const { default: db } = await import('./config/db');
        db.close();
        console.log('Database connection closed');
      } catch (err) {
        console.error('Error closing database:', err);
      }

      console.log('Graceful shutdown complete');
      process.exit(0);
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
      console.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

start();
