import cron from 'node-cron';
import prisma from '../lib/prisma';
import { publishQueue } from '../queue/queue';

cron.schedule('*/1 * * * *', async () => {
  const now = new Date();
  const scheduledPosts = await prisma.post.findMany({
    where: {
      status: 'SCHEDULED',
      scheduledAt: {
        lte: now,
      },
    },
    select: { id: true },
  });

  for (const post of scheduledPosts) {
    await prisma.post.update({
      where: { id: post.id },
      data: { status: 'PUBLISHING' },
    });
    await publishQueue.add({ postId: post.id }, { attempts: 3, backoff: { type: 'exponential', delay: 10000 } });
  }
});
