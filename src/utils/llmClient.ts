/**
 * Shared LLM client utilities.
 *
 * Consolidates LLM calling logic used by GenerateModal,
 * useProgressiveGeneration, and other consumers.
 * Routes through the ensemble layer when ensemble mode is enabled.
 */

import { getLLMSettings, getProviderSettings } from '@/utils/llmKeyStore';
import type { LLMSettings } from '@/utils/llmKeyStore';

// Re-export for convenience
export { getLLMSettings };
export type { LLMSettings };

/** Structured response from an LLM call, including optional citations. */
export interface LLMResponse {
  content: string;
  citations?: string[];
}

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
  conversationHistory?: Array<{ role: string; content: string }>;
}

/**
 * Extract citations from an LLM API response.
 * Supports Perplexity format (top-level `citations` array or nested in message).
 */
export function extractCitations(data: Record<string, unknown>): string[] | undefined {
  // Perplexity returns citations at the top level
  if (Array.isArray(data.citations) && data.citations.length > 0) {
    return data.citations.filter((c: unknown) => typeof c === 'string') as string[];
  }

  // Some providers nest citations in the message
  const message = (data.choices as Array<{ message?: { citations?: unknown[] } }>)?.[0]?.message;
  if (message && Array.isArray(message.citations) && message.citations.length > 0) {
    return message.citations.filter((c: unknown) => typeof c === 'string') as string[];
  }

  return undefined;
}

/**
 * Call an OpenAI-compatible chat completion API with explicit settings.
 * Returns structured response with content and optional citations.
 */
export async function callLLMWithSettings(
  params: CallLLMParams & { settings: LLMSettings },
): Promise<LLMResponse> {
  const { systemPrompt, userMessage, maxTokens = 6000, signal, settings, conversationHistory } = params;

  const messages: Array<{ role: string; content: string }> = [
    { role: 'system', content: systemPrompt },
  ];

  if (conversationHistory) {
    for (const entry of conversationHistory) {
      messages.push({ role: entry.role, content: entry.content });
    }
  }

  messages.push({ role: 'user', content: userMessage });

  const response = await fetch(`${settings.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${settings.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: settings.model,
      messages,
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
  const citations = extractCitations(data);

  return {
    content: stripThinkingBlocks(content),
    citations,
  };
}

/**
 * Call an OpenAI-compatible chat completion API.
 * Returns structured response with content and optional citations.
 * Routes through ensemble when enabled.
 */
export async function callLLMWithCitations(params: CallLLMParams): Promise<LLMResponse> {
  // Lazy import to avoid circular dependency
  const { callLLMEnsemble } = await import('@/utils/llmEnsemble');
  return callLLMEnsemble(params);
}

/**
 * Call an OpenAI-compatible chat completion API.
 *
 * Uses the user's configured LLM settings (API key, base URL, model).
 * Automatically strips thinking blocks from the response.
 * Routes through ensemble when enabled.
 */
export async function callLLM(params: CallLLMParams): Promise<string> {
  const response = await callLLMWithCitations(params);
  return response.content;
}

/**
 * Call LLM with source grounding.
 * Injects user sources into the system prompt and extracts source citations from the response.
 */
export async function callLLMWithSources(
  params: CallLLMParams,
  sources: import('@/types/tree').UserSource[],
): Promise<LLMResponse & { sourceCitations?: import('@/types/tree').ParsedCitation[] }> {
  const { injectSourcesIntoPrompt, extractCitationsFromText } = await import('@/utils/sourceInjection');
  const augmented: CallLLMParams = {
    ...params,
    systemPrompt: injectSourcesIntoPrompt(params.systemPrompt, sources),
  };
  const response = await callLLMWithCitations(augmented);
  const sourceCitations = extractCitationsFromText(response.content, sources);
  return {
    ...response,
    sourceCitations: sourceCitations.length > 0 ? sourceCitations : undefined,
  };
}

/**
 * Call LLM with a specific provider by ID.
 * Does NOT route through ensemble — used for direct provider access.
 */
export async function callLLMForProvider(
  providerId: string,
  params: CallLLMParams,
): Promise<LLMResponse> {
  const settings = getProviderSettings(providerId);
  if (!settings) {
    throw new Error(`Provider ${providerId} not configured or missing API key.`);
  }
  return callLLMWithSettings({ ...params, settings });
}
