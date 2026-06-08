import { getBoss } from './queue';
import { processPublishJob } from '../services/postService';
import logger from '../lib/logger';

export async function startWorker() {
  const boss = await getBoss();

  await boss.work<{ postId: string }>('publish', async (jobs) => {
    for (const job of jobs) {
      logger.info('Procesando job %s para post %s', job.id, job.data.postId);
      await processPublishJob(job.data.postId);
    }
  });

  logger.info('pg-boss worker registrado en cola publish');
}
