import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

interface SendMessagePayload {
  messaging_product: 'whatsapp';
  to: string;
  type: 'text';
  text: { body: string };
}

export async function sendWhatsAppText(waId: string, text: string): Promise<void> {
  const url = `${config.whatsapp.baseUrl}/${config.whatsapp.phoneNumberId}/messages`;

  const body: SendMessagePayload = {
    messaging_product: 'whatsapp',
    to: waId,
    type: 'text',
    text: { body: text },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.whatsapp.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errBody = await response.text();
    logger.error({ status: response.status, errBody, waId }, 'sendWhatsAppText failed');
    throw new Error(`WhatsApp API error: ${response.status}`);
  }

  logger.debug({ waId }, 'WhatsApp message sent');
}
