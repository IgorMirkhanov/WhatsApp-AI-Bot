import { SERVICE_OPTIONS } from '../types/index.js';

/** Step IDs — add new steps here without changing the state machine engine */
export const STEP_IDS = {
  WELCOME: 'welcome',
  NAME: 'name',
  COMPANY: 'company',
  SPHERE: 'sphere',
  SERVICE: 'service',
  CITY: 'city',
  QUALIFIED: 'qualified',
  CLOSED: 'closed',
} as const;

export type StepId = (typeof STEP_IDS)[keyof typeof STEP_IDS];

export interface StepDefinition {
  id: StepId;
  /** Field on `leads` updated when this step completes */
  field?: 'name' | 'company' | 'sphere' | 'service' | 'city';
  /** Prompt sent when entering this step (after transition) */
  prompt: string | ((ctx: { leadName?: string | null }) => string);
  /** Whether user can skip (e.g. company) */
  allowSkip?: boolean;
  skipKeywords?: string[];
  /** Next step after successful input */
  next: StepId;
  /** Next step when user skips */
  nextOnSkip?: StepId;
}

const serviceList = SERVICE_OPTIONS.map((s, i) => `${i + 1}. ${s}`).join('\n');

export const STEP_SEQUENCE: StepDefinition[] = [
  {
    id: STEP_IDS.WELCOME,
    prompt:
      'Здравствуйте! 👋 Я ассистент MediaPeace. Помогу подобрать решение под ваш бизнес.\n\n' +
      'Для начала — как вас зовут?',
    next: STEP_IDS.NAME,
  },
  {
    id: STEP_IDS.NAME,
    field: 'name',
    prompt: 'Приятно познакомиться! Как называется ваша компания?\n\n(можно написать «пропустить»)',
    next: STEP_IDS.COMPANY,
  },
  {
    id: STEP_IDS.COMPANY,
    field: 'company',
    allowSkip: true,
    skipKeywords: ['пропустить', 'skip', 'нет', '-', '—'],
    prompt: 'В какой сфере работает ваша компания?',
    next: STEP_IDS.SPHERE,
    nextOnSkip: STEP_IDS.SPHERE,
  },
  {
    id: STEP_IDS.SPHERE,
    field: 'sphere',
    prompt: `Какая услуга вас интересует?\n\n${serviceList}\n\nНапишите номер или название услуги.`,
    next: STEP_IDS.SERVICE,
  },
  {
    id: STEP_IDS.SERVICE,
    field: 'service',
    prompt: 'В каком городе вы находитесь?',
    next: STEP_IDS.CITY,
  },
  {
    id: STEP_IDS.CITY,
    field: 'city',
    prompt: (ctx) =>
      `Спасибо${ctx.leadName ? `, ${ctx.leadName}` : ''}! ✅\n\n` +
      'Мы получили вашу заявку. Менеджер MediaPeace свяжется с вами в ближайшее время.',
    next: STEP_IDS.QUALIFIED,
  },
  {
    id: STEP_IDS.QUALIFIED,
    prompt: 'Ваша заявка уже принята. Если есть дополнения — напишите, мы передадим менеджеру.',
    next: STEP_IDS.QUALIFIED,
  },
];

export const STEP_MAP = new Map(STEP_SEQUENCE.map((s) => [s.id, s]));

export const TOUCHPOINT_MESSAGES = {
  touchpoint_1:
    'Напоминаем: мы ждём ваш ответ, чтобы подобрать лучшее решение для вашего бизнеса. Напишите, когда будет удобно 🙂',
  touchpoint_2:
    'К сожалению, мы не получили ответ. Если захотите продолжить — просто напишите нам в любое время.',
} as const;

export const SKIP_KEYWORDS_DEFAULT = ['пропустить', 'skip', 'нет', '-', '—'];
