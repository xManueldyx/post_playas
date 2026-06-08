import { PgBoss } from 'pg-boss';
import prisma from '../lib/prisma';
import logger from '../lib/logger';

let boss: PgBoss | null = null;
let started = false;

export async function getBoss(): Promise<PgBoss> {
  if (boss && started) return boss;

  boss = new PgBoss({
    connectionString: process.env.DATABASE_URL!,
    schema: 'pgboss',
    monitorStateIntervalSeconds: 30,
    retentionDays: 7,
    deleteAfterDays: 7,
  } as any);

  boss.on('error' as any, (error: Error) => {
    logger.error('pg-boss error: %o', error);
  });

  boss.on('stopped' as any, () => {
    started = false;
  });

  await boss.start();
  started = true;

  await boss.createQueue('publish');

  logger.info('pg-boss started');

  return boss;
}

async function recoverOrphanedPosts() {
  if (!boss) return;

  const now = new Date();

  const stuckPublishing = await prisma.post.findMany({
    where: { status: 'PUBLISHING' },
    select: { id: true },
  });

  for (const post of stuckPublishing) {
    logger.info('Recuperando post huerfano en PUBLISHING: %s', post.id);
    await boss.send('publish', { postId: post.id }, {
      retryLimit: 3,
      retryDelay: 10,
      expireInSeconds: 3600,
    });
  }

  const dueScheduled = await prisma.post.findMany({
    where: {
      status: 'SCHEDULED',
      scheduledAt: { lte: now },
    },
    select: { id: true },
  });

  for (const post of dueScheduled) {
    logger.info('Recuperando post vencido en SCHEDULED: %s', post.id);
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
}

export async function schedulePost(postId: string, scheduledAt: Date) {
  const b = await getBoss();
  const delaySeconds = Math.max(
    0,
    Math.ceil((scheduledAt.getTime() - Date.now()) / 1000)
  );

  await b.send('publish', { postId }, {
    startAfter: delaySeconds,
    retryLimit: 3,
    retryDelay: 10,
    expireInSeconds: 82800,
  });

  logger.info('Post %s programado para %s (en %d segundos)', postId, scheduledAt, delaySeconds);
}

export async function publishNow(postId: string) {
  const b = await getBoss();
  await b.send('publish', { postId }, {
    retryLimit: 3,
    retryDelay: 10,
    expireInSeconds: 3600,
  });
}

export async function stopBoss() {
  if (boss && started) {
    await boss.stop({ graceful: true, timeout: 30_000 });
    started = false;
    logger.info('pg-boss stopped gracefully');
  }
}
