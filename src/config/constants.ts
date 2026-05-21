export const QUEUE_NAME = 'lead-touchpoints';

/** BullMQ job ID prefix — one active touchpoint chain per wa_id */
export const touchpointJobId = (waId: string, name: string): string =>
  `touchpoint:${waId}:${name}`;
