export type LeadStatus = 'New' | 'In Progress' | 'Qualified' | 'No Response';
export type MessageSender = 'bot' | 'client';
export type TouchpointJobName = 'touchpoint_1' | 'touchpoint_2';

export const SERVICE_OPTIONS = [
  'Разработка сайта',
  'Контекстная реклама',
  'SEO-продвижение',
  'SMM',
  'Таргетированная реклама',
  'Чат-боты и AI-ассистенты',
  'Комплексный маркетинг',
  'Другое',
] as const;

export type ServiceOption = (typeof SERVICE_OPTIONS)[number];

export interface Lead {
  id: string;
  wa_id: string;
  name: string | null;
  company: string | null;
  sphere: string | null;
  service: string | null;
  city: string | null;
  source: string;
  status: LeadStatus;
  current_step: string;
  last_client_message_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  lead_id: string;
  sender: MessageSender;
  text: string;
  created_at: string;
}

export interface StepContext {
  lead: Lead;
  userMessage: string;
}

export interface StepResult {
  reply: string;
  nextStep: string;
  leadPatch?: Partial<Pick<Lead, 'name' | 'company' | 'sphere' | 'service' | 'city' | 'status'>>;
  skipTouchpointSchedule?: boolean;
}

export interface TouchpointJobData {
  waId: string;
  leadId: string;
  touchpoint: TouchpointJobName;
  /** ISO timestamp when this touchpoint chain was scheduled (step change) */
  scheduledAt: string;
}

export interface WhatsAppIncomingMessage {
  waId: string;
  messageId: string;
  text: string;
  timestamp: string;
}
