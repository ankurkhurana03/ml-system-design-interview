import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchUrlContent, searchWeb, getJinaApiKey, saveJinaApiKey } from '@/utils/jinaClient';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const mockStorage = vi.hoisted(() => {
  const store: Record<string, string> = {};
  return {
    store,
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { Object.keys(store).forEach(k => delete store[k]); }),
    length: 0,
    key: vi.fn(() => null),
  };
});
vi.stubGlobal('localStorage', mockStorage);

describe('jinaClient', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockStorage.clear();
    vi.clearAllMocks();
  });

  describe('fetchUrlContent', () => {
    it('fetches and parses reader API response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            title: 'ML Best Practices',
            content: '# ML Best Practices\n\nContent here...',
          },
        }),
      });

      const result = await fetchUrlContent('https://example.com/article');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://r.jina.ai/https://example.com/article',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({ Accept: 'application/json' }),
        }),
      );
      expect(result.title).toBe('ML Best Practices');
      expect(result.content).toContain('ML Best Practices');
    });

    it('throws on HTTP error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await expect(fetchUrlContent('https://bad-url.com')).rejects.toThrow(
        'Jina Reader error (404)',
      );
    });

    it('falls back to hostname when title is missing', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { title: '', content: 'Some content' },
        }),
      });

      const result = await fetchUrlContent('https://example.com/path');
      expect(result.title).toBe('example.com');
    });
  });

  describe('searchWeb', () => {
    it('fetches and parses search results', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              title: 'Result 1',
              url: 'https://example.com/1',
              description: 'First result',
              content: 'Full content 1',
            },
            {
              title: 'Result 2',
              url: 'https://example.com/2',
              description: 'Second result',
            },
          ],
        }),
      });

      const results = await searchWeb('ML system design');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://s.jina.ai/ML%20system%20design',
        expect.objectContaining({ method: 'GET' }),
      );
      expect(results).toHaveLength(2);
      expect(results[0].title).toBe('Result 1');
      expect(results[0].content).toBe('Full content 1');
      // Falls back to description for content
      expect(results[1].content).toBe('Second result');
    });

    it('returns empty array for no results', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      });

      const results = await searchWeb('obscure query');
      expect(results).toEqual([]);
    });

    it('throws on HTTP error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(searchWeb('test')).rejects.toThrow('Jina Search error (500)');
    });

    it('throws helpful message on 401', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      });

      await expect(searchWeb('test')).rejects.toThrow('API key');
    });

    it('includes Authorization header when API key is set', async () => {
      saveJinaApiKey('test-key-123');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      });

      await searchWeb('test query');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-key-123',
          }),
        }),
      );
    });
  });

  describe('API key management', () => {
    it('returns empty string when no key stored', () => {
      expect(getJinaApiKey()).toBe('');
    });

    it('saves and retrieves API key', () => {
      saveJinaApiKey('jina_abc123');
      expect(getJinaApiKey()).toBe('jina_abc123');
    });

    it('removes key when saving empty string', () => {
      saveJinaApiKey('jina_abc123');
      saveJinaApiKey('');
      expect(getJinaApiKey()).toBe('');
    });
  });
});
