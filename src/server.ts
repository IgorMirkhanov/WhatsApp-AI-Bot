import express, { type Request, type Response } from 'express';
import { config } from './config/index.js';
import { getWebhookVerification, postWebhook } from './controllers/webhook.controller.js';
import { logger } from './utils/logger.js';

const app = express();

app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    env: config.nodeEnv,
    port: config.port,
  });
});

/** Meta WhatsApp Cloud API webhook (use ngrok: ngrok http 3000) */
app.get('/webhook', getWebhookVerification);
app.post('/webhook', postWebhook);

app.use((err: Error, _req: Request, res: Response, _next: express.NextFunction) => {
  logger.error({ err }, 'Unhandled error');
  if (!res.headersSent) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(config.port, () => {
  logger.info(
    {
      port: config.port,
      shortTimeouts: config.shortTimeouts,
      webhookPath: '/webhook',
    },
    'MediaPeace WhatsApp bot server started — expose via ngrok for Meta Dashboard'
  );
});
