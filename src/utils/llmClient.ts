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

/** Parameters for streaming LLM calls. */
export interface CallLLMStreamingParams extends CallLLMParams {
  /** Called with each incremental text chunk as it arrives. */
  onChunk: (text: string) => void;
}

/**
 * Call an OpenAI-compatible chat completion API with streaming.
 *
 * Uses the primary provider's settings. Parses SSE (Server-Sent Events) format
 * and calls `onChunk` with each incremental text piece. Returns the full
 * accumulated text when the stream completes.
 *
 * Falls back to non-streaming `callLLM` if the streaming request fails.
 */
export async function callLLMStreaming(params: CallLLMStreamingParams): Promise<string> {
  const { systemPrompt, userMessage, maxTokens = 6000, signal, conversationHistory, onChunk } =
    params;

  const settings = getLLMSettings();
  if (!settings) {
    throw new Error('No LLM settings configured. Please configure your API key in settings.');
  }

  const messages: Array<{ role: string; content: string }> = [
    { role: 'system', content: systemPrompt },
  ];

  if (conversationHistory) {
    for (const entry of conversationHistory) {
      messages.push({ role: entry.role, content: entry.content });
    }
  }

  messages.push({ role: 'user', content: userMessage });

  let response: Response;
  try {
    response = await fetch(`${settings.baseUrl}/chat/completions`, {
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
        stream: true,
      }),
      signal,
    });
  } catch (err) {
    // Network error — fall back to non-streaming
    console.warn('[LLM Streaming] Fetch failed, falling back to non-streaming:', err);
    return callLLM({ systemPrompt, userMessage, maxTokens, signal, conversationHistory });
  }

  if (!response.ok) {
    // API error — fall back to non-streaming
    const errorText = await response.text();
    console.warn('[LLM Streaming] API error, falling back to non-streaming:', errorText);
    return callLLM({ systemPrompt, userMessage, maxTokens, signal, conversationHistory });
  }

  if (!response.body) {
    // No streaming body — fall back to non-streaming
    console.warn('[LLM Streaming] No response body, falling back to non-streaming');
    return callLLM({ systemPrompt, userMessage, maxTokens, signal, conversationHistory });
  }

  // Parse SSE stream
  let accumulated = '';
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Process complete lines from the buffer
      const lines = buffer.split('\n');
      // Keep the last potentially incomplete line in the buffer
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();

        // Skip empty lines and comments
        if (!trimmed || trimmed.startsWith(':')) continue;

        // Handle data lines
        if (trimmed.startsWith('data: ')) {
          const data = trimmed.slice(6);

          // Stream complete
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              accumulated += content;
              onChunk(accumulated);
            }
          } catch {
            // Skip malformed JSON chunks
          }
        }
      }
    }

    // Process any remaining buffer
    if (buffer.trim()) {
      const trimmed = buffer.trim();
      if (trimmed.startsWith('data: ') && trimmed.slice(6) !== '[DONE]') {
        try {
          const parsed = JSON.parse(trimmed.slice(6));
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            accumulated += content;
            onChunk(accumulated);
          }
        } catch {
          // Skip malformed JSON
        }
      }
    }
  } catch (err) {
    // If we got partial content before the error, return what we have
    if (accumulated.length > 0) {
      console.warn('[LLM Streaming] Stream interrupted, returning partial content:', err);
      return stripThinkingBlocks(accumulated);
    }
    // Otherwise fall back to non-streaming
    console.warn('[LLM Streaming] Stream failed, falling back to non-streaming:', err);
    return callLLM({ systemPrompt, userMessage, maxTokens, signal, conversationHistory });
  }

  if (!accumulated) {
    // No content received via stream — fall back to non-streaming
    console.warn('[LLM Streaming] Empty stream, falling back to non-streaming');
    return callLLM({ systemPrompt, userMessage, maxTokens, signal, conversationHistory });
  }

  return stripThinkingBlocks(accumulated);
}
