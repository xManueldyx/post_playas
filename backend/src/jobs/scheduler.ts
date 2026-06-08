import { getBoss } from '../queue/queue';
import prisma from '../lib/prisma';
import logger from '../lib/logger';

const POLL_INTERVAL_MS = 30_000;

async function dispatchOverduePosts() {
  const boss = await getBoss();
  const now = new Date();

  const dueScheduled = await prisma.post.findMany({
    where: {
      status: 'SCHEDULED',
      scheduledAt: { lte: now },
    },
    select: { id: true },
  });

  for (const post of dueScheduled) {
    logger.info('Programador: post vencido SCHEDULED %s', post.id);
    await prisma.post.update({
      where: { id: post.id },
      data: { status: 'PUBLISHING' },
    });
    await boss.send('publish', { postId: post.id }, {
      retryLimit: 3,
      retryDelay: 10,
      expireInSeconds: 3600,
    });
  }

  const stuckPublishing = await prisma.post.findMany({
    where: { status: 'PUBLISHING' },
    select: { id: true },
  });

  for (const post of stuckPublishing) {
    logger.info('Programador: post huerfano PUBLISHING %s', post.id);
    await boss.send('publish', { postId: post.id }, {
      retryLimit: 3,
      retryDelay: 10,
      expireInSeconds: 3600,
    });
  }
}

export async function startScheduler() {
  await getBoss();

  await dispatchOverduePosts();

  setInterval(() => {
    dispatchOverduePosts().catch((err) => {
      logger.error('Error en el programador periodico: %o', err);
    });
  }, POLL_INTERVAL_MS);

  logger.info('Programador iniciado: sondea posts vencidos cada %d segundos', POLL_INTERVAL_MS / 1000);
}
