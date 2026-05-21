import { STEP_IDS } from '../config/steps.js';
import { processStep } from './stateMachine.js';
import {
  cancelTouchpointsForWaId,
  scheduleTouchpointChainOnStepChange,
} from '../services/queue.js';
import {
  createLead,
  findLeadByWaId,
  isLeadQualified,
  saveMessage,
  updateLead,
} from '../services/supabase.js';
import { sendWhatsAppText } from '../services/whatsapp.js';
import type { Lead, WhatsAppIncomingMessage } from '../types/index.js';
import { logger } from '../utils/logger.js';

/**
 * Public entry point for webhook ingestion. Keeps session/CRM logic in handleIncomingMessage.
 */
export async function handleClientMessage(waId: string, text: string): Promise<void> {
  return handleIncomingMessage({
    waId,
    text,
    messageId: `webhook-${Date.now()}`,
    timestamp: String(Math.floor(Date.now() / 1000)),
  });
}

export async function handleIncomingMessage(msg: WhatsAppIncomingMessage): Promise<void> {
  const { waId, text } = msg;

  let lead = await findLeadByWaId(waId);
  const isNew = !lead;

  if (!lead) {
    lead = await createLead(waId, STEP_IDS.WELCOME);
    logger.info({ waId, leadId: lead.id }, 'New lead created');
  }

  if (lead.status === 'No Response') {
    lead = await updateLead(lead.id, {
      status: 'In Progress',
      current_step: STEP_IDS.WELCOME,
    });
  }

  await saveMessage(lead.id, 'client', text);

  const result = await processStep({ lead, userMessage: text });

  const patch: Parameters<typeof updateLead>[1] = {
    ...result.leadPatch,
    current_step: result.nextStep,
    last_client_message_at: new Date().toISOString(),
  };

  const merged: Lead = { ...lead, ...patch };
  if (isLeadQualified(merged) && lead.status !== 'Qualified') {
    patch.status = 'Qualified';
  } else if (!patch.status && merged.status !== 'Qualified') {
    patch.status = 'In Progress';
  }

  lead = await updateLead(lead.id, patch);

  await saveMessage(lead.id, 'bot', result.reply);
  await sendWhatsAppText(waId, result.reply);

  if (!result.skipTouchpointSchedule && lead.status === 'In Progress') {
    await scheduleTouchpointChainOnStepChange(waId, lead.id);
  }

  if (lead.status === 'Qualified') {
    await cancelTouchpointsForWaId(waId);
  }

  logger.info({ waId, isNew, step: result.nextStep, status: lead.status }, 'Message processed');
}
