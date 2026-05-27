import Queue from 'bull';

export const publishQueue = new Queue('publish', process.env.REDIS_URL ?? 'redis://127.0.0.1:6379');

publishQueue.on('failed', (job, err) => {
  console.error('Job failed', job.id, err.message);
});

publishQueue.on('completed', (job) => {
  console.log('Job completed', job.id);
});
