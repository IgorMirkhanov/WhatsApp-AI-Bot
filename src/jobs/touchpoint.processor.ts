import { config } from '../config/index.js';
import { TOUCHPOINT_MESSAGES, STEP_IDS } from '../config/steps.js';
import { scheduleTouchpoint } from '../services/queue.js';
import { findLeadByWaId, saveMessage, updateLead } from '../services/supabase.js';
import { sendWhatsAppText } from '../services/whatsapp.js';
import type { TouchpointJobData } from '../types/index.js';
import { logger } from '../utils/logger.js';

function hasUserRespondedSinceScheduled(
  lead: { last_client_message_at: string | null },
  scheduledAt: string
): boolean {
  if (!lead.last_client_message_at) return false;
  return new Date(lead.last_client_message_at) >= new Date(scheduledAt);
}

export async function processTouchpointJob(data: TouchpointJobData): Promise<void> {
  const { waId, leadId, touchpoint } = data;
  const lead = await findLeadByWaId(waId);

  if (!lead || lead.id !== leadId) {
    logger.warn({ waId, leadId }, 'Lead not found for touchpoint');
    return;
  }

  if (lead.status === 'Qualified' || lead.status === 'No Response') {
    logger.debug({ waId, status: lead.status }, 'Skipping touchpoint — terminal status');
    return;
  }

  if (hasUserRespondedSinceScheduled(lead, data.scheduledAt)) {
    logger.info({ waId, touchpoint }, 'User responded — touchpoint skipped');
    return;
  }

  if (touchpoint === 'touchpoint_1') {
    const text = TOUCHPOINT_MESSAGES.touchpoint_1;
    await saveMessage(lead.id, 'bot', text);
    await sendWhatsAppText(waId, text);

    await scheduleTouchpoint(
      { waId, leadId, touchpoint: 'touchpoint_2', scheduledAt: data.scheduledAt },
      config.touchpointDelays.touchpoint_2
    );
    return;
  }

  if (touchpoint === 'touchpoint_2') {
    const text = TOUCHPOINT_MESSAGES.touchpoint_2;
    await saveMessage(lead.id, 'bot', text);
    await sendWhatsAppText(waId, text);

    await updateLead(lead.id, {
      status: 'No Response',
      current_step: STEP_IDS.CLOSED,
    });

    logger.info({ waId }, 'Lead marked No Response');
  }
}
