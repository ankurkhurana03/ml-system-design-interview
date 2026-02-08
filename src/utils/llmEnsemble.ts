/**
 * Multi-LLM ensemble orchestrator.
 *
 * When ensemble mode is enabled, calls all enabled providers in parallel,
 * then synthesizes the responses using the primary provider as collator.
 * When disabled, routes directly to the primary provider.
 */

import {
  isEnsembleEnabled,
  getEnabledProviders,
  getPrimaryProvider,
  getProviderSettings,
} from '@/utils/llmKeyStore';
import type { LLMSettings } from '@/utils/llmKeyStore';
import { callLLMWithSettings } from '@/utils/llmClient';
import type { CallLLMParams, LLMResponse } from '@/utils/llmClient';

interface ProviderResult {
  providerId: string;
  providerName: string;
  response: LLMResponse;
}

/**
 * Main entry point: routes through ensemble if enabled, otherwise direct call.
 */
export async function callLLMEnsemble(params: CallLLMParams): Promise<LLMResponse> {
  const primary = getPrimaryProvider();
  if (!primary) {
    throw new Error('No LLM settings configured. Please configure your API key in settings.');
  }

  const enabledProviders = getEnabledProviders();

  // If ensemble is off or only one provider, go direct
  if (!isEnsembleEnabled() || enabledProviders.length < 2) {
    const settings: LLMSettings = {
      apiKey: primary.apiKey,
      baseUrl: primary.baseUrl,
      model: primary.model,
    };
    return callLLMWithSettings({ ...params, settings });
  }

  // Call all enabled providers in parallel
  const results = await callAllProviders(enabledProviders.map((p) => p.id), params);

  // Filter successful results
  const successes = results.filter((r): r is ProviderResult => r !== null);

  if (successes.length === 0) {
    throw new Error('All LLM providers failed. Please check your settings.');
  }

  // If only one succeeded, return it directly
  if (successes.length === 1) {
    return successes[0].response;
  }

  // Collate responses using the primary provider
  const primarySettings: LLMSettings = {
    apiKey: primary.apiKey,
    baseUrl: primary.baseUrl,
    model: primary.model,
  };

  return collateResponses(primarySettings, params, successes);
}

/**
 * Call all providers in parallel with per-provider error handling.
 */
async function callAllProviders(
  providerIds: string[],
  params: CallLLMParams,
): Promise<(ProviderResult | null)[]> {
  const promises = providerIds.map(async (id): Promise<ProviderResult | null> => {
    try {
      const settings = getProviderSettings(id);
      if (!settings) {
        console.warn(`[Ensemble] Provider ${id}: no settings/key configured, skipping`);
        return null;
      }

      const providers = getEnabledProviders();
      const provider = providers.find((p) => p.id === id);
      const name = provider?.name || id;

      const response = await callLLMWithSettings({ ...params, settings });
      return { providerId: id, providerName: name, response };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[Ensemble] Provider ${id} failed:`, msg);
      return null;
    }
  });

  return Promise.all(promises);
}

/**
 * Synthesize multiple provider responses into one using the primary provider.
 */
async function collateResponses(
  primarySettings: LLMSettings,
  originalParams: CallLLMParams,
  results: ProviderResult[],
): Promise<LLMResponse> {
  const responseSummaries = results
    .map(
      (r, i) =>
        `--- Response from ${r.providerName} (Provider ${i + 1}) ---\n${r.response.content}\n`,
    )
    .join('\n');

  const collationPrompt = `You received the following responses from multiple AI providers to the same question. Synthesize the best elements of each into a single, high-quality response.

ORIGINAL QUESTION CONTEXT:
System: ${originalParams.systemPrompt.substring(0, 500)}
User: ${originalParams.userMessage.substring(0, 500)}

PROVIDER RESPONSES:
${responseSummaries}

INSTRUCTIONS:
- Combine the strongest points from each response
- Resolve any contradictions by favoring the most accurate/detailed answer
- Maintain the original format expected by the system prompt
- Do NOT mention that multiple providers were consulted
- Output ONLY the synthesized response, no meta-commentary`;

  const collatedResponse = await callLLMWithSettings({
    systemPrompt: 'You are a response synthesizer. Combine multiple AI responses into one optimal response.',
    userMessage: collationPrompt,
    maxTokens: originalParams.maxTokens || 6000,
    signal: originalParams.signal,
    settings: primarySettings,
  });

  // Merge citations from all providers (deduplicated)
  const allCitations: string[] = [];
  const seen = new Set<string>();
  for (const result of results) {
    if (result.response.citations) {
      for (const c of result.response.citations) {
        if (!seen.has(c)) {
          seen.add(c);
          allCitations.push(c);
        }
      }
    }
  }
  // Also include any citations from the collation response itself
  if (collatedResponse.citations) {
    for (const c of collatedResponse.citations) {
      if (!seen.has(c)) {
        seen.add(c);
        allCitations.push(c);
      }
    }
  }

  return {
    content: collatedResponse.content,
    citations: allCitations.length > 0 ? allCitations : undefined,
  };
}
