import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock localStorage and sessionStorage for llmKeyStore
const mockStorage = vi.hoisted(() => {
  const store: Record<string, string> = {};
  return {
    store,
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach((k) => delete store[k]);
    }),
    length: 0,
    key: vi.fn(() => null),
  };
});

vi.stubGlobal('localStorage', mockStorage);
vi.stubGlobal('sessionStorage', mockStorage);

// Mock the llmKeyStore module to provide settings
const mockGetLLMSettings = vi.hoisted(() =>
  vi.fn(() => ({
    apiKey: 'test-key',
    baseUrl: 'https://api.test.com/v1',
    model: 'test-model',
  })),
);

vi.mock('@/utils/llmKeyStore', () => ({
  getLLMSettings: mockGetLLMSettings,
  getProviderSettings: vi.fn(),
  PROVIDER_PRESETS: {},
}));

// Mock callLLM (non-streaming fallback) to avoid real API calls
const mockCallLLM = vi.hoisted(() => vi.fn());
const mockCallLLMEnsemble = vi.hoisted(() => vi.fn());

vi.mock('@/utils/llmEnsemble', () => ({
  callLLMEnsemble: mockCallLLMEnsemble,
}));

// Helper to create SSE-formatted data
function sseChunk(content: string): string {
  return `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`;
}

function createMockStream(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let index = 0;
  return new ReadableStream({
    pull(controller) {
      if (index < chunks.length) {
        controller.enqueue(encoder.encode(chunks[index]));
        index++;
      } else {
        controller.close();
      }
    },
  });
}

describe('callLLMStreaming', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStorage.clear();
    mockGetLLMSettings.mockReturnValue({
      apiKey: 'test-key',
      baseUrl: 'https://api.test.com/v1',
      model: 'test-model',
    });
    mockCallLLMEnsemble.mockResolvedValue({ content: 'fallback response' });
  });

  it('parses SSE chunks and calls onChunk with accumulated text', async () => {
    const chunks = [
      sseChunk('Hello'),
      sseChunk(' world'),
      sseChunk('!'),
      'data: [DONE]\n\n',
    ];

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        body: createMockStream(chunks),
        text: vi.fn(),
      }),
    );

    const { callLLMStreaming } = await import('@/utils/llmClient');

    const receivedChunks: string[] = [];
    const result = await callLLMStreaming({
      systemPrompt: 'You are a test',
      userMessage: 'Say hello',
      onChunk: (text) => receivedChunks.push(text),
    });

    expect(result).toBe('Hello world!');
    expect(receivedChunks).toEqual(['Hello', 'Hello world', 'Hello world!']);
  });

  it('handles [DONE] signal properly', async () => {
    const chunks = [
      sseChunk('Done test'),
      'data: [DONE]\n\n',
    ];

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        body: createMockStream(chunks),
        text: vi.fn(),
      }),
    );

    const { callLLMStreaming } = await import('@/utils/llmClient');

    const receivedChunks: string[] = [];
    const result = await callLLMStreaming({
      systemPrompt: 'Test',
      userMessage: 'Test',
      onChunk: (text) => receivedChunks.push(text),
    });

    expect(result).toBe('Done test');
  });

  it('handles multiple SSE events in a single chunk', async () => {
    // Multiple events arrive in one chunk
    const combinedChunk = sseChunk('Part1') + sseChunk('Part2');
    const chunks = [combinedChunk, 'data: [DONE]\n\n'];

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        body: createMockStream(chunks),
        text: vi.fn(),
      }),
    );

    const { callLLMStreaming } = await import('@/utils/llmClient');

    const receivedChunks: string[] = [];
    const result = await callLLMStreaming({
      systemPrompt: 'Test',
      userMessage: 'Test',
      onChunk: (text) => receivedChunks.push(text),
    });

    expect(result).toBe('Part1Part2');
    expect(receivedChunks).toContain('Part1');
    expect(receivedChunks).toContain('Part1Part2');
  });

  it('falls back to non-streaming on fetch error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('Network error')),
    );

    mockCallLLMEnsemble.mockResolvedValue({ content: 'non-streaming fallback' });

    const { callLLMStreaming } = await import('@/utils/llmClient');

    const receivedChunks: string[] = [];
    const result = await callLLMStreaming({
      systemPrompt: 'Test',
      userMessage: 'Test',
      onChunk: (text) => receivedChunks.push(text),
    });

    expect(result).toBe('non-streaming fallback');
  });

  it('falls back to non-streaming on API error (non-ok response)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        text: vi.fn().mockResolvedValue('Internal Server Error'),
      }),
    );

    mockCallLLMEnsemble.mockResolvedValue({ content: 'error fallback response' });

    const { callLLMStreaming } = await import('@/utils/llmClient');

    const receivedChunks: string[] = [];
    const result = await callLLMStreaming({
      systemPrompt: 'Test',
      userMessage: 'Test',
      onChunk: (text) => receivedChunks.push(text),
    });

    expect(result).toBe('error fallback response');
  });

  it('falls back to non-streaming when response body is null', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        body: null,
        text: vi.fn(),
      }),
    );

    mockCallLLMEnsemble.mockResolvedValue({ content: 'no body fallback' });

    const { callLLMStreaming } = await import('@/utils/llmClient');

    const receivedChunks: string[] = [];
    const result = await callLLMStreaming({
      systemPrompt: 'Test',
      userMessage: 'Test',
      onChunk: (text) => receivedChunks.push(text),
    });

    expect(result).toBe('no body fallback');
  });

  it('throws error when no LLM settings are configured', async () => {
    mockGetLLMSettings.mockReturnValue(null);

    const { callLLMStreaming } = await import('@/utils/llmClient');

    await expect(
      callLLMStreaming({
        systemPrompt: 'Test',
        userMessage: 'Test',
        onChunk: () => {},
      }),
    ).rejects.toThrow('No LLM settings configured');
  });

  it('skips malformed JSON chunks without erroring', async () => {
    const chunks = [
      sseChunk('Good'),
      'data: {invalid json\n\n',
      sseChunk(' data'),
      'data: [DONE]\n\n',
    ];

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        body: createMockStream(chunks),
        text: vi.fn(),
      }),
    );

    const { callLLMStreaming } = await import('@/utils/llmClient');

    const receivedChunks: string[] = [];
    const result = await callLLMStreaming({
      systemPrompt: 'Test',
      userMessage: 'Test',
      onChunk: (text) => receivedChunks.push(text),
    });

    expect(result).toBe('Good data');
  });

  it('skips SSE comment lines (starting with :)', async () => {
    const chunks = [
      ': this is a comment\n\n',
      sseChunk('Content'),
      'data: [DONE]\n\n',
    ];

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        body: createMockStream(chunks),
        text: vi.fn(),
      }),
    );

    const { callLLMStreaming } = await import('@/utils/llmClient');

    const receivedChunks: string[] = [];
    const result = await callLLMStreaming({
      systemPrompt: 'Test',
      userMessage: 'Test',
      onChunk: (text) => receivedChunks.push(text),
    });

    expect(result).toBe('Content');
  });

  it('strips thinking blocks from accumulated content', async () => {
    const chunks = [
      sseChunk('<think>reasoning</think>'),
      sseChunk('actual answer'),
      'data: [DONE]\n\n',
    ];

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        body: createMockStream(chunks),
        text: vi.fn(),
      }),
    );

    const { callLLMStreaming } = await import('@/utils/llmClient');

    const result = await callLLMStreaming({
      systemPrompt: 'Test',
      userMessage: 'Test',
      onChunk: () => {},
    });

    expect(result).toBe('actual answer');
  });

  it('sends correct request body with stream: true', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      body: createMockStream([sseChunk('hi'), 'data: [DONE]\n\n']),
      text: vi.fn(),
    });
    vi.stubGlobal('fetch', mockFetch);

    const { callLLMStreaming } = await import('@/utils/llmClient');

    await callLLMStreaming({
      systemPrompt: 'System prompt',
      userMessage: 'User msg',
      maxTokens: 1000,
      onChunk: () => {},
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.test.com/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-key',
          'Content-Type': 'application/json',
        }),
      }),
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.stream).toBe(true);
    expect(body.model).toBe('test-model');
    expect(body.messages[0].role).toBe('system');
    expect(body.messages[0].content).toBe('System prompt');
    expect(body.messages[1].role).toBe('user');
    expect(body.messages[1].content).toBe('User msg');
  });
});
