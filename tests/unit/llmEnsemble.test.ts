import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the llmKeyStore module
const mocks = vi.hoisted(() => ({
  isEnsembleEnabled: vi.fn(() => false),
  getEnabledProviders: vi.fn(() => []),
  getPrimaryProvider: vi.fn(() => null),
  getProviderSettings: vi.fn(() => null),
}));

vi.mock('@/utils/llmKeyStore', () => ({
  isEnsembleEnabled: mocks.isEnsembleEnabled,
  getEnabledProviders: mocks.getEnabledProviders,
  getPrimaryProvider: mocks.getPrimaryProvider,
  getProviderSettings: mocks.getProviderSettings,
}));

// Mock callLLMWithSettings
const mockCallLLMWithSettings = vi.hoisted(() => vi.fn());
vi.mock('@/utils/llmClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/llmClient')>();
  return {
    ...actual,
    callLLMWithSettings: mockCallLLMWithSettings,
  };
});

import { callLLMEnsemble } from '@/utils/llmEnsemble';

describe('llmEnsemble', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const baseParams = {
    systemPrompt: 'You are a test assistant',
    userMessage: 'Hello',
    maxTokens: 100,
  };

  it('throws when no primary provider is configured', async () => {
    mocks.getPrimaryProvider.mockReturnValue(null);
    await expect(callLLMEnsemble(baseParams)).rejects.toThrow('No LLM settings configured');
  });

  it('calls primary provider directly when ensemble is off', async () => {
    mocks.getPrimaryProvider.mockReturnValue({
      id: 'p1', name: 'OpenAI', preset: 'openai',
      baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o',
      apiKey: 'sk-test', enabled: true, isPrimary: true,
    });
    mocks.isEnsembleEnabled.mockReturnValue(false);
    mocks.getEnabledProviders.mockReturnValue([{ id: 'p1' }]);
    mockCallLLMWithSettings.mockResolvedValue({ content: 'Single response', citations: undefined });

    const result = await callLLMEnsemble(baseParams);
    expect(result.content).toBe('Single response');
    expect(mockCallLLMWithSettings).toHaveBeenCalledTimes(1);
  });

  it('calls primary directly when only one provider is enabled (even with ensemble on)', async () => {
    mocks.getPrimaryProvider.mockReturnValue({
      id: 'p1', name: 'OpenAI', preset: 'openai',
      baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o',
      apiKey: 'sk-test', enabled: true, isPrimary: true,
    });
    mocks.isEnsembleEnabled.mockReturnValue(true);
    mocks.getEnabledProviders.mockReturnValue([{ id: 'p1' }]);
    mockCallLLMWithSettings.mockResolvedValue({ content: 'Solo response' });

    const result = await callLLMEnsemble(baseParams);
    expect(result.content).toBe('Solo response');
    expect(mockCallLLMWithSettings).toHaveBeenCalledTimes(1);
  });

  it('calls all providers and collates when ensemble is on with 2+ providers', async () => {
    mocks.getPrimaryProvider.mockReturnValue({
      id: 'p1', name: 'OpenAI', preset: 'openai',
      baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o',
      apiKey: 'sk-test', enabled: true, isPrimary: true,
    });
    mocks.isEnsembleEnabled.mockReturnValue(true);
    mocks.getEnabledProviders.mockReturnValue([
      { id: 'p1', name: 'OpenAI', enabled: true },
      { id: 'p2', name: 'Perplexity', enabled: true },
    ]);
    mocks.getProviderSettings.mockImplementation((id: string) => {
      if (id === 'p1') return { apiKey: 'sk-1', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o' };
      if (id === 'p2') return { apiKey: 'pplx-1', baseUrl: 'https://api.perplexity.ai', model: 'sonar-pro' };
      return null;
    });

    // First two calls are parallel provider calls, third is collation
    mockCallLLMWithSettings
      .mockResolvedValueOnce({ content: 'OpenAI answer', citations: ['https://openai.com/blog'] })
      .mockResolvedValueOnce({ content: 'Perplexity answer', citations: ['https://arxiv.org/1234'] })
      .mockResolvedValueOnce({ content: 'Synthesized answer', citations: undefined });

    const result = await callLLMEnsemble(baseParams);
    expect(result.content).toBe('Synthesized answer');
    // Merged citations from both providers
    expect(result.citations).toEqual(['https://openai.com/blog', 'https://arxiv.org/1234']);
    // 2 provider calls + 1 collation call
    expect(mockCallLLMWithSettings).toHaveBeenCalledTimes(3);
  });

  it('handles individual provider failures gracefully', async () => {
    mocks.getPrimaryProvider.mockReturnValue({
      id: 'p1', name: 'OpenAI', preset: 'openai',
      baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o',
      apiKey: 'sk-test', enabled: true, isPrimary: true,
    });
    mocks.isEnsembleEnabled.mockReturnValue(true);
    mocks.getEnabledProviders.mockReturnValue([
      { id: 'p1', name: 'OpenAI', enabled: true },
      { id: 'p2', name: 'Perplexity', enabled: true },
    ]);
    mocks.getProviderSettings.mockImplementation((id: string) => {
      if (id === 'p1') return { apiKey: 'sk-1', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o' };
      if (id === 'p2') return { apiKey: 'pplx-1', baseUrl: 'https://api.perplexity.ai', model: 'sonar-pro' };
      return null;
    });

    // One provider succeeds, one fails
    mockCallLLMWithSettings
      .mockResolvedValueOnce({ content: 'OpenAI answer' })
      .mockRejectedValueOnce(new Error('Perplexity rate limited'));

    const result = await callLLMEnsemble(baseParams);
    // With only 1 success, returns it directly without collation
    expect(result.content).toBe('OpenAI answer');
    expect(mockCallLLMWithSettings).toHaveBeenCalledTimes(2); // No collation needed
  });

  it('throws when all providers fail', async () => {
    mocks.getPrimaryProvider.mockReturnValue({
      id: 'p1', name: 'OpenAI', preset: 'openai',
      baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o',
      apiKey: 'sk-test', enabled: true, isPrimary: true,
    });
    mocks.isEnsembleEnabled.mockReturnValue(true);
    mocks.getEnabledProviders.mockReturnValue([
      { id: 'p1', name: 'OpenAI', enabled: true },
      { id: 'p2', name: 'Perplexity', enabled: true },
    ]);
    mocks.getProviderSettings.mockImplementation((id: string) => {
      if (id === 'p1') return { apiKey: 'sk-1', baseUrl: 'a', model: 'm' };
      if (id === 'p2') return { apiKey: 'pplx-1', baseUrl: 'b', model: 'n' };
      return null;
    });

    mockCallLLMWithSettings
      .mockRejectedValueOnce(new Error('Fail 1'))
      .mockRejectedValueOnce(new Error('Fail 2'));

    await expect(callLLMEnsemble(baseParams)).rejects.toThrow('All LLM providers failed');
  });

  it('deduplicates citations across providers', async () => {
    mocks.getPrimaryProvider.mockReturnValue({
      id: 'p1', name: 'OpenAI', preset: 'openai',
      baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o',
      apiKey: 'sk-test', enabled: true, isPrimary: true,
    });
    mocks.isEnsembleEnabled.mockReturnValue(true);
    mocks.getEnabledProviders.mockReturnValue([
      { id: 'p1', name: 'OpenAI', enabled: true },
      { id: 'p2', name: 'Perplexity', enabled: true },
    ]);
    mocks.getProviderSettings.mockImplementation((id: string) => {
      if (id === 'p1') return { apiKey: 'sk-1', baseUrl: 'a', model: 'm' };
      if (id === 'p2') return { apiKey: 'pplx-1', baseUrl: 'b', model: 'n' };
      return null;
    });

    const sharedUrl = 'https://shared-source.com';
    mockCallLLMWithSettings
      .mockResolvedValueOnce({ content: 'A', citations: [sharedUrl, 'https://unique-a.com'] })
      .mockResolvedValueOnce({ content: 'B', citations: [sharedUrl, 'https://unique-b.com'] })
      .mockResolvedValueOnce({ content: 'Collated' });

    const result = await callLLMEnsemble(baseParams);
    expect(result.citations).toEqual([sharedUrl, 'https://unique-a.com', 'https://unique-b.com']);
  });
});
