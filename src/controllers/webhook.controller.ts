import type { Request, Response } from 'express';
import { config } from '../config/index.js';
import { handleClientMessage } from '../bot/sessionHandler.js';
import {
  extractInboundTextMessages,
  extractPrimaryInboundMessage,
} from '../services/whatsapp.webhook.js';
import { logger } from '../utils/logger.js';

type HubQuery = {
  'hub.mode'?: string;
  'hub.verify_token'?: string;
  'hub.challenge'?: string;
};

/**
 * Meta webhook verification (GET).
 * @see https://developers.facebook.com/docs/graph-api/webhooks/getting-started
 */
export function getWebhookVerification(req: Request, res: Response): void {
  const query = req.query as HubQuery;
  const mode = query['hub.mode'];
  const token = query['hub.verify_token'];
  const challenge = query['hub.challenge'];

  if (
    mode === 'subscribe' &&
    token === config.whatsapp.verifyToken &&
    typeof challenge === 'string' &&
    challenge.length > 0
  ) {
    logger.info('WhatsApp webhook verified successfully');
    res.status(200).send(challenge);
    return;
  }

  logger.warn({ mode, tokenPresent: Boolean(token) }, 'WhatsApp webhook verification failed');
  res.sendStatus(403);
}

/**
 * Meta incoming events (POST). Responds immediately; processes messages in the background.
 */
export function postWebhook(req: Request, res: Response): void {
  res.status(200).send('EVENT_RECEIVED');

  const body: unknown = req.body;

  const primary = extractPrimaryInboundMessage(body);
  const allMessages = extractInboundTextMessages(body);
  const toProcess =
    allMessages.length > 0 ? allMessages : primary ? [primary] : [];

  if (toProcess.length === 0) {
    return;
  }

  for (const { waId, text } of toProcess) {
    void handleClientMessage(waId, text).catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      console.error(
        `[webhook] Background processing failed for waId=${waId}: ${message}`,
        err
      );
      logger.error({ err, waId }, 'Background handleClientMessage failed');
    });
  }
}
