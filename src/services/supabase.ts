import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config/index.js';
import type { Lead, LeadStatus, Message, MessageSender } from '../types/index.js';
import { logger } from '../utils/logger.js';

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!client) {
    client = createClient(config.supabase.url, config.supabase.serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

export async function findLeadByWaId(waId: string): Promise<Lead | null> {
  const { data, error } = await getSupabase()
    .from('leads')
    .select('*')
    .eq('wa_id', waId)
    .maybeSingle();

  if (error) {
    logger.error({ err: error, waId }, 'findLeadByWaId failed');
    throw error;
  }
  return data as Lead | null;
}

export async function createLead(waId: string, currentStep: string): Promise<Lead> {
  const { data, error } = await getSupabase()
    .from('leads')
    .insert({
      wa_id: waId,
      status: 'In Progress' as LeadStatus,
      current_step: currentStep,
      source: 'WhatsApp',
    })
    .select('*')
    .single();

  if (error) {
    logger.error({ err: error, waId }, 'createLead failed');
    throw error;
  }
  return data as Lead;
}

export async function updateLead(
  id: string,
  patch: Partial<
    Pick<Lead, 'name' | 'company' | 'sphere' | 'service' | 'city' | 'status' | 'current_step'> & {
      last_client_message_at?: string;
    }
  >
): Promise<Lead> {
  const { data, error } = await getSupabase()
    .from('leads')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    logger.error({ err: error, id, patch }, 'updateLead failed');
    throw error;
  }
  return data as Lead;
}

export async function saveMessage(
  leadId: string,
  sender: MessageSender,
  text: string
): Promise<Message> {
  const { data, error } = await getSupabase()
    .from('messages')
    .insert({ lead_id: leadId, sender, text })
    .select('*')
    .single();

  if (error) {
    logger.error({ err: error, leadId }, 'saveMessage failed');
    throw error;
  }
  return data as Message;
}

export function isLeadQualified(lead: Lead): boolean {
  return Boolean(lead.name?.trim() && lead.service?.trim() && lead.city?.trim());
}
