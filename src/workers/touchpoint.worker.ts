import { Worker } from 'bullmq';
import { QUEUE_NAME } from '../config/constants.js';
import { processTouchpointJob } from '../jobs/touchpoint.processor.js';
import { getRedisConnection } from '../services/queue.js';
import type { TouchpointJobData } from '../types/index.js';
import { logger } from '../utils/logger.js';

const worker = new Worker<TouchpointJobData>(
  QUEUE_NAME,
  async (job) => {
    logger.info({ jobId: job.id, name: job.name }, 'Processing touchpoint');
    await processTouchpointJob(job.data);
  },
  {
    connection: getRedisConnection(),
    concurrency: 5,
  }
);

worker.on('completed', (job) => {
  logger.debug({ jobId: job.id }, 'Touchpoint job completed');
});

worker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err }, 'Touchpoint job failed');
});

logger.info('Touchpoint worker started');

process.on('SIGTERM', async () => {
  await worker.close();
  process.exit(0);
});
