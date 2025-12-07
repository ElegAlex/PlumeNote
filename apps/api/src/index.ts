// ===========================================
// PlumeNote API - Point d'entrée
// ===========================================

import { buildApp } from './app.js';
import { config } from './config/index.js';
import { logger } from './lib/logger.js';

async function start() {
  const app = await buildApp();

  try {
    await app.listen({
      port: config.port,
      host: '0.0.0.0',
    });

    logger.info(`Server listening on http://0.0.0.0:${config.port}`);
    logger.info(`Environment: ${config.env}`);
    logger.info(`API Documentation: http://localhost:${config.port}/docs`);
  } catch (err) {
    logger.error(err);
    process.exit(1);
  }
}

// Gestion des signaux pour arrêt propre
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

start();
