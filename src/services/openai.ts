import OpenAI from 'openai';
import { config } from '../config/index.js';
import { SERVICE_OPTIONS, type ServiceOption } from '../types/index.js';
import { logger } from '../utils/logger.js';

const DEFAULT_MODEL = 'deepseek-chat';

const serviceEnum = [...SERVICE_OPTIONS];

let openai: OpenAI | null = null;

function getClient(): OpenAI {
  if (!openai) {
    openai = new OpenAI({
      apiKey: config.openai.apiKey,
      baseURL: config.openai.baseURL,
    });
  }
  return openai;
}

function getModel(): string {
  return config.openai.model || DEFAULT_MODEL;
}

/** Strip markdown fences and parse JSON from LLM output (DeepSeek json_object mode). */
function parseJsonFromLlm<T>(raw: string): T {
  const trimmed = raw.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/i);
  const jsonText = fenceMatch ? fenceMatch[1].trim() : trimmed;
  return JSON.parse(jsonText) as T;
}

const JSON_ONLY_INSTRUCTION =
  'Respond with raw valid JSON only. No markdown, no code fences, no explanation text before or after the JSON object.';

export interface ServiceMappingResult {
  service: ServiceOption | null;
  isValid: boolean;
}

export async function mapUserMessageToService(
  userMessage: string
): Promise<ServiceMappingResult> {
  try {
    const response = await getClient().chat.completions.create({
      model: getModel(),
      temperature: 0,
      messages: [
        {
          role: 'system',
          content:
            `${JSON_ONLY_INSTRUCTION} ` +
            'Map the user message to one predefined Russian marketing/IT service. ' +
            `matched_service must be exactly one of: ${serviceEnum.join('; ')}. ` +
            'Return JSON: {"matched_service": string, "confidence": number 0-1, "is_valid": boolean}. ' +
            'If the user picks "Другое" or describes a custom need, set matched_service to "Другое". ' +
            'Accept number selections (1-8) and natural language.',
        },
        { role: 'user', content: userMessage },
      ],
      response_format: { type: 'json_object' },
    });

    const raw = response.choices[0]?.message?.content;
    if (!raw) return { service: null, isValid: false };

    const parsed = parseJsonFromLlm<{
      matched_service: ServiceOption;
      confidence: number;
      is_valid: boolean;
    }>(raw);

    if (!parsed.is_valid || parsed.confidence < 0.5) {
      return { service: null, isValid: false };
    }

    if (!serviceEnum.includes(parsed.matched_service)) {
      return { service: null, isValid: false };
    }

    return { service: parsed.matched_service, isValid: true };
  } catch (err) {
    logger.error({ err }, 'mapUserMessageToService failed');
    return fallbackServiceMatch(userMessage);
  }
}

export async function extractCustomService(userMessage: string): Promise<string | null> {
  try {
    const response = await getClient().chat.completions.create({
      model: getModel(),
      temperature: 0,
      messages: [
        {
          role: 'system',
          content:
            `${JSON_ONLY_INSTRUCTION} ` +
            'Extract a short Russian description of the custom marketing/IT service the user wants. ' +
            'Return JSON: {"service_description": string, "is_valid": boolean}. ' +
            'If unclear or unrelated, set is_valid to false and service_description to "".',
        },
        { role: 'user', content: userMessage },
      ],
      response_format: { type: 'json_object' },
    });

    const raw = response.choices[0]?.message?.content;
    if (!raw) return null;

    const parsed = parseJsonFromLlm<{ service_description: string; is_valid: boolean }>(raw);
    if (!parsed.is_valid || !parsed.service_description.trim()) return null;

    return `Другое: ${parsed.service_description.trim()}`;
  } catch (err) {
    logger.error({ err }, 'extractCustomService failed');
    return userMessage.trim() ? `Другое: ${userMessage.trim()}` : null;
  }
}

/** Deterministic fallback when the LLM API is unavailable */
function fallbackServiceMatch(text: string): ServiceMappingResult {
  const normalized = text.trim().toLowerCase();
  const num = parseInt(normalized, 10);
  if (num >= 1 && num <= SERVICE_OPTIONS.length) {
    return { service: SERVICE_OPTIONS[num - 1], isValid: true };
  }

  for (const option of SERVICE_OPTIONS) {
    if (normalized.includes(option.toLowerCase())) {
      return { service: option, isValid: true };
    }
  }

  if (normalized.includes('другое') || normalized.includes('other')) {
    return { service: 'Другое', isValid: true };
  }

  return { service: null, isValid: false };
}
