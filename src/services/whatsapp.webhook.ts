import type {
  IngestedClientMessage,
  WhatsAppInboundTextMessage,
  WhatsAppWebhookBody,
  WhatsAppWebhookMessageValue,
} from '../types/whatsapp.webhook.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isTextMessage(value: unknown): value is WhatsAppInboundTextMessage {
  if (!isRecord(value)) return false;
  return (
    isNonEmptyString(value.from) &&
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.timestamp) &&
    value.type === 'text' &&
    isRecord(value.text) &&
    isNonEmptyString(value.text.body)
  );
}

function isMessageValue(value: unknown): value is WhatsAppWebhookMessageValue {
  if (!isRecord(value)) return false;
  if (value.messages === undefined) return true;
  return Array.isArray(value.messages);
}

function isWebhookChange(value: unknown): value is { field: string; value: WhatsAppWebhookMessageValue } {
  if (!isRecord(value)) return false;
  return isNonEmptyString(value.field) && isMessageValue(value.value);
}

function isWebhookEntry(value: unknown): value is { id: string; changes: unknown[] } {
  if (!isRecord(value)) return false;
  return isNonEmptyString(value.id) && Array.isArray(value.changes);
}

export function isWhatsAppWebhookBody(body: unknown): body is WhatsAppWebhookBody {
  if (!isRecord(body)) return false;
  if (body.object !== 'whatsapp_business_account') return false;
  if (!Array.isArray(body.entry) || body.entry.length === 0) return false;
  return body.entry.every(isWebhookEntry);
}

function toIngested(msg: WhatsAppInboundTextMessage): IngestedClientMessage {
  return {
    waId: msg.from,
    text: msg.text.body,
    messageId: msg.id,
    timestamp: msg.timestamp,
  };
}

function collectTextMessagesFromValue(
  value: WhatsAppWebhookMessageValue
): IngestedClientMessage[] {
  const result: IngestedClientMessage[] = [];
  for (const raw of value.messages ?? []) {
    if (isTextMessage(raw)) {
      result.push(toIngested(raw));
    }
  }
  return result;
}

/**
 * Extracts all inbound text messages from a verified WhatsApp Cloud API webhook body.
 * Safely walks entry[].changes[].value.messages[] (not only index 0).
 */
export function extractInboundTextMessages(body: unknown): IngestedClientMessage[] {
  if (!isWhatsAppWebhookBody(body)) {
    return [];
  }

  const messages: IngestedClientMessage[] = [];

  for (const entry of body.entry) {
    for (const change of entry.changes) {
      if (!isWebhookChange(change)) continue;
      messages.push(...collectTextMessagesFromValue(change.value));
    }
  }

  return messages;
}

/**
 * Primary path used by Meta samples: entry[0].changes[0].value.messages[0].
 * Returns null when structure is missing or message is not text.
 */
export function extractPrimaryInboundMessage(body: unknown): IngestedClientMessage | null {
  if (!isWhatsAppWebhookBody(body)) return null;

  const entry = body.entry[0];
  const change = entry?.changes[0];
  if (!change || !isWebhookChange(change)) return null;

  const messageData = change.value.messages?.[0];
  if (!isTextMessage(messageData)) return null;

  return toIngested(messageData);
}
