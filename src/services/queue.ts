import { Queue, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';
import { config } from '../config/index.js';
import { QUEUE_NAME, touchpointJobId } from '../config/constants.js';
import type { TouchpointJobData, TouchpointJobName } from '../types/index.js';
import { logger } from '../utils/logger.js';

let connection: IORedis | null = null;
let touchpointQueue: Queue<TouchpointJobData> | null = null;

export function getRedisConnection(): IORedis {
  if (!connection) {
    connection = new IORedis(config.redis.url, {
      maxRetriesPerRequest: null,
    });
  }
  return connection;
}

export function getTouchpointQueue(): Queue<TouchpointJobData> {
  if (!touchpointQueue) {
    touchpointQueue = new Queue<TouchpointJobData>(QUEUE_NAME, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: 100,
      },
    });
  }
  return touchpointQueue;
}

/** Cancel all pending touchpoint jobs for a WhatsApp user */
export async function cancelTouchpointsForWaId(waId: string): Promise<void> {
  const queue = getTouchpointQueue();
  const jobNames: TouchpointJobName[] = ['touchpoint_1', 'touchpoint_2'];

  await Promise.all(
    jobNames.map(async (name) => {
      const job = await queue.getJob(touchpointJobId(waId, name));
      if (job) {
        await job.remove();
        logger.debug({ waId, name }, 'Cancelled touchpoint job');
      }
    })
  );
}

export async function scheduleTouchpoint(
  data: Omit<TouchpointJobData, 'scheduledAt'> & { scheduledAt?: string },
  delayMs: number
): Promise<void> {
  const queue = getTouchpointQueue();
  const jobId = touchpointJobId(data.waId, data.touchpoint);
  const payload: TouchpointJobData = {
    ...data,
    scheduledAt: data.scheduledAt ?? new Date().toISOString(),
  };

  const existing = await queue.getJob(jobId);
  if (existing) await existing.remove();

  await queue.add(payload.touchpoint, payload, {
    jobId,
    delay: delayMs,
  });

  logger.info(
    { waId: data.waId, touchpoint: data.touchpoint, delayMs },
    'Touchpoint scheduled'
  );
}

export async function scheduleTouchpointChainOnStepChange(
  waId: string,
  leadId: string
): Promise<void> {
  const scheduledAt = new Date().toISOString();
  await cancelTouchpointsForWaId(waId);
  await scheduleTouchpoint(
    { waId, leadId, touchpoint: 'touchpoint_1', scheduledAt },
    config.touchpointDelays.touchpoint_1
  );
}

export function createQueueEvents(): QueueEvents {
  return new QueueEvents(QUEUE_NAME, { connection: getRedisConnection() });
}
