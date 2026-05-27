import { publishQueue } from './queue';
import { processPublishJob } from '../services/postService';

publishQueue.process(async (job) => {
  const { postId } = job.data as { postId: string };
  return processPublishJob(postId);
});

publishQueue.on('error', (error) => {
  console.error('Publish queue error', error);
});
