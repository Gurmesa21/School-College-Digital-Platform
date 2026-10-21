import { createApp } from './app.js';
import { config } from './config/env.js';

const app = createApp();

const server = app.listen(config.PORT, () => {
  console.log(`[API] Server listening on http://localhost:${config.PORT}`);
  console.log(`[API] Health check available at http://localhost:${config.PORT}/health`);
  console.log(`[API] Versioned prefix active at http://localhost:${config.PORT}${config.API_PREFIX}/health`);
});

// Graceful shutdown handling
function shutdown(signal: string) {
  console.log(`[API] Received ${signal}. Starting graceful shutdown...`);
  server.close((err) => {
    if (err) {
      console.error('[API] Error during server close:', err);
      process.exit(1);
    }
    console.log('[API] Server closed gracefully. Process exiting.');
    process.exit(0);
  });

  // Force shutdown after 10s timeout
  setTimeout(() => {
    console.error('[API] Forceful shutdown initiated after timeout.');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  console.error('[API] Unhandled Promise Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('[API] Uncaught Exception:', error);
  process.exit(1);
});
