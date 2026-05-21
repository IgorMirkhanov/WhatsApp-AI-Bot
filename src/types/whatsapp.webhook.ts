/** Meta WhatsApp Cloud API — incoming webhook payload (subset used for ingestion) */

export type WhatsAppWebhookObject = 'whatsapp_business_account';

export interface WhatsAppTextMessageBody {
  body: string;
}

export interface WhatsAppInboundTextMessage {
  from: string;
  id: string;
  timestamp: string;
  type: 'text';
  text: WhatsAppTextMessageBody;
}

export interface WhatsAppWebhookMessageValue {
  messaging_product?: string;
  metadata?: {
    display_phone_number?: string;
    phone_number_id?: string;
  };
  contacts?: Array<{ profile: { name: string }; wa_id: string }>;
  messages?: WhatsAppInboundTextMessage[];
  statuses?: unknown[];
}

export interface WhatsAppWebhookChange {
  field: string;
  value: WhatsAppWebhookMessageValue;
}

export interface WhatsAppWebhookEntry {
  id: string;
  changes: WhatsAppWebhookChange[];
}

export interface WhatsAppWebhookBody {
  object: WhatsAppWebhookObject;
  entry: WhatsAppWebhookEntry[];
}

export interface IngestedClientMessage {
  waId: string;
  text: string;
  messageId: string;
  timestamp: string;
}
