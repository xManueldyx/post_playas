import dotenv from 'dotenv';
dotenv.config();

import { app } from './app';
import { startWorker } from './queue/worker';
import { startScheduler } from './jobs/scheduler';
import { stopBoss } from './queue/queue';
import prisma from './lib/prisma';
import logger from './lib/logger';

const port = process.env.PORT ? Number(process.env.PORT) : 4000;

async function main() {
  await startWorker();
  await startScheduler();

  const server = app.listen(port, '0.0.0.0', () => {
    logger.info('Backend listening on http://0.0.0.0:%d', port);
  });

  const shutdown = async (signal: string) => {
    logger.info('Recibido %s. Cerrando gracefully...', signal);

    server.close(async () => {
      logger.info('HTTP server cerrado');
      await stopBoss();
      await prisma.$disconnect();
      logger.info('Recursos liberados. Bye.');
      process.exit(0);
    });

    setTimeout(() => {
      logger.warn('Forzando salida tras timeout.');
      process.exit(1);
    }, 15_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((error) => {
  logger.error('Fallo al iniciar: %o', error);
  process.exit(1);
});
