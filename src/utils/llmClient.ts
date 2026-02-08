/**
 * Shared LLM client utilities.
 *
 * Consolidates LLM calling logic used by GenerateModal and
 * useProgressiveGeneration into one place.
 */

import { getLLMSettings } from '@/utils/llmKeyStore';
import type { LLMSettings } from '@/utils/llmKeyStore';

// Re-export for convenience
export { getLLMSettings };
export type { LLMSettings };

/** Strip `<think>...</think>` blocks emitted by reasoning models. */
export function stripThinkingBlocks(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
}

/**
 * Attempt to parse a JSON array from potentially malformed LLM output.
 *
 * Handles:
 * - Code-block wrapping (```json ... ```)
 * - Truncated JSON (unclosed strings, objects, arrays)
 */
export function tryParseJSON(text: string): unknown[] | null {
  // Try extracting from code blocks first
  const codeBlockMatch = text.match(/```(?:json)?\n([\s\S]*?)\n```/);
  const raw = codeBlockMatch ? codeBlockMatch[1] : text;
  const trimmed = raw.trim();

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) return parsed;
    return null;
  } catch {
    // Try fixing truncated JSON array
    let fixed = trimmed;
    // Close unclosed string
    const quoteCount = (fixed.match(/(?<!\\)"/g) || []).length;
    if (quoteCount % 2 !== 0) fixed += '"';
    // Close unclosed objects
    const openBraces = (fixed.match(/{/g) || []).length;
    const closeBraces = (fixed.match(/}/g) || []).length;
    for (let i = 0; i < openBraces - closeBraces; i++) fixed += '}';
    // Close array if needed
    if (!fixed.endsWith(']')) fixed += ']';
    try {
      const parsed = JSON.parse(fixed);
      if (Array.isArray(parsed)) return parsed;
      return null;
    } catch {
      return null;
    }
  }
}

export interface CallLLMParams {
  systemPrompt: string;
  userMessage: string;
  maxTokens?: number;
  signal?: AbortSignal;
}

/**
 * Call an OpenAI-compatible chat completion API.
 *
 * Uses the user's configured LLM settings (API key, base URL, model).
 * Automatically strips thinking blocks from the response.
 */
export async function callLLM(params: CallLLMParams): Promise<string> {
  const { systemPrompt, userMessage, maxTokens = 6000, signal } = params;

  const settings = getLLMSettings();
  if (!settings) {
    throw new Error('No LLM settings configured. Please configure your API key in settings.');
  }

  const response = await fetch(`${settings.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${settings.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: settings.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.7,
      max_tokens: maxTokens,
    }),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LLM API error: ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';
  return stripThinkingBlocks(content);
}
