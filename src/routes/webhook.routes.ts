import { Router } from 'express';
import { getWebhookVerification, postWebhook } from '../controllers/webhook.controller.js';

/** Optional router mount — routes are also registered directly in server.ts */
export const webhookRouter = Router();

webhookRouter.get('/', getWebhookVerification);
webhookRouter.post('/', postWebhook);
