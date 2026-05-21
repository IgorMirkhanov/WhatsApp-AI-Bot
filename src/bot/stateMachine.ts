import { STEP_IDS, STEP_MAP, STEP_SEQUENCE, SKIP_KEYWORDS_DEFAULT } from '../config/steps.js';
import { extractCustomService, mapUserMessageToService } from '../services/openai.js';
import { isLeadQualified } from '../services/supabase.js';
import type { Lead, StepContext, StepResult } from '../types/index.js';
import { SERVICE_OPTIONS } from '../types/index.js';

function normalize(text: string): string {
  return text.trim().toLowerCase();
}

function isSkip(text: string, keywords: string[] = SKIP_KEYWORDS_DEFAULT): boolean {
  const n = normalize(text);
  return keywords.some((k) => n === k.toLowerCase() || n.includes(k.toLowerCase()));
}

function resolvePrompt(
  prompt: string | ((ctx: { leadName?: string | null }) => string),
  lead: Lead
): string {
  return typeof prompt === 'function' ? prompt({ leadName: lead.name }) : prompt;
}

function getStepDef(stepId: string) {
  return STEP_MAP.get(stepId as (typeof STEP_IDS)[keyof typeof STEP_IDS]);
}

/** Process user input for the current step; returns bot reply and DB patches */
export async function processStep(ctx: StepContext): Promise<StepResult> {
  const { lead, userMessage } = ctx;
  const stepId = lead.current_step;
  const step = getStepDef(stepId);

  if (!step) {
    return {
      reply: 'Произошла ошибка сессии. Напишите «начать», чтобы начать заново.',
      nextStep: STEP_IDS.WELCOME,
    };
  }

  if (lead.status === 'Qualified' || stepId === STEP_IDS.QUALIFIED) {
    const qualified = STEP_MAP.get(STEP_IDS.QUALIFIED)!;
    return {
      reply: resolvePrompt(qualified.prompt, lead),
      nextStep: STEP_IDS.QUALIFIED,
      skipTouchpointSchedule: true,
    };
  }

  if (lead.status === 'No Response' || stepId === STEP_IDS.CLOSED) {
    return {
      reply:
        'Сессия была закрыта из-за отсутствия ответа. Напишите любое сообщение — мы продолжим с начала.',
      nextStep: STEP_IDS.WELCOME,
      leadPatch: { status: 'In Progress' },
    };
  }

  // Welcome: any first message moves to name collection (greeting already implied)
  if (stepId === STEP_IDS.WELCOME) {
    const nameStep = STEP_MAP.get(STEP_IDS.NAME)!;
    return {
      reply: resolvePrompt(nameStep.prompt, lead),
      nextStep: STEP_IDS.NAME,
    };
  }

  // Handle skip for optional steps
  if (step.allowSkip && isSkip(userMessage, step.skipKeywords)) {
    const nextId = step.nextOnSkip ?? step.next;
    const nextStep = STEP_MAP.get(nextId)!;
    return {
      reply: resolvePrompt(nextStep.prompt, lead),
      nextStep: nextId,
      leadPatch: step.field ? { [step.field]: null } : undefined,
    };
  }

  const value = userMessage.trim();
  if (!value) {
    return {
      reply: 'Пожалуйста, отправьте текстовое сообщение.',
      nextStep: stepId,
      skipTouchpointSchedule: true,
    };
  }

  switch (stepId) {
    case STEP_IDS.NAME:
      return buildFieldTransition(lead, step, value);

    case STEP_IDS.COMPANY:
      return buildFieldTransition(lead, step, value);

    case STEP_IDS.SPHERE:
      return buildFieldTransition(lead, step, value);

    case STEP_IDS.SERVICE:
      return processServiceStep(lead, step, value);

    case STEP_IDS.CITY:
      return processCityStep(lead, step, value);

    default:
      return {
        reply: resolvePrompt(step.prompt, lead),
        nextStep: stepId,
        skipTouchpointSchedule: true,
      };
  }
}

function buildFieldTransition(
  lead: Lead,
  step: NonNullable<ReturnType<typeof getStepDef>>,
  value: string
): StepResult {
  const nextStep = STEP_MAP.get(step.next)!;
  const patch: StepResult['leadPatch'] = {};

  if (step.field) {
    (patch as Record<string, string>)[step.field] = value;
  }

  return {
    reply: resolvePrompt(nextStep.prompt, { ...lead, ...patch }),
    nextStep: step.next,
    leadPatch: patch,
  };
}

async function processServiceStep(
  lead: Lead,
  step: NonNullable<ReturnType<typeof getStepDef>>,
  value: string
): Promise<StepResult> {
  const mapping = await mapUserMessageToService(value);

  if (!mapping.isValid || !mapping.service) {
    const list = SERVICE_OPTIONS.map((s, i) => `${i + 1}. ${s}`).join('\n');
    return {
      reply: `Не удалось определить услугу. Выберите из списка:\n\n${list}`,
      nextStep: STEP_IDS.SERVICE,
      skipTouchpointSchedule: true,
    };
  }

  let serviceValue: string = mapping.service;

  if (mapping.service === 'Другое') {
    const custom = await extractCustomService(value);
    if (!custom) {
      return {
        reply: 'Опишите, пожалуйста, какая услуга вас интересует.',
        nextStep: STEP_IDS.SERVICE,
        skipTouchpointSchedule: true,
      };
    }
    serviceValue = custom;
  }

  const nextStep = STEP_MAP.get(step.next)!;
  return {
    reply: resolvePrompt(nextStep.prompt, { ...lead, service: serviceValue }),
    nextStep: step.next,
    leadPatch: { service: serviceValue },
  };
}

function processCityStep(
  lead: Lead,
  step: NonNullable<ReturnType<typeof getStepDef>>,
  value: string
): StepResult {
  const updated = { ...lead, city: value };
  const qualified = isLeadQualified(updated);
  const nextStep = STEP_MAP.get(step.next)!;

  return {
    reply: resolvePrompt(nextStep.prompt, updated),
    nextStep: qualified ? STEP_IDS.QUALIFIED : step.next,
    leadPatch: {
      city: value,
      ...(qualified ? { status: 'Qualified' as const } : {}),
    },
  };
}

/** Ordered step IDs for documentation / validation */
export function getConfiguredStepOrder(): string[] {
  return STEP_SEQUENCE.map((s) => s.id);
}
