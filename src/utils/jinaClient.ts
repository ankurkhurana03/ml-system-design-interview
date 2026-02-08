/**
 * Jina AI APIs for CORS-safe URL reading and web search.
 *
 * - r.jina.ai: Reads a URL and returns markdown content
 * - s.jina.ai: Web search returning results with snippets
 *
 * The Search API requires a Jina API key (free tier available at jina.ai).
 * The Reader API works without a key but benefits from one for higher rate limits.
 */

const JINA_KEY_STORAGE = 'jina_api_key';

/** Get stored Jina API key from localStorage. */
export function getJinaApiKey(): string {
  try {
    return localStorage.getItem(JINA_KEY_STORAGE) || '';
  } catch {
    return '';
  }
}

/** Save Jina API key to localStorage. */
export function saveJinaApiKey(key: string): void {
  if (key) {
    localStorage.setItem(JINA_KEY_STORAGE, key);
  } else {
    localStorage.removeItem(JINA_KEY_STORAGE);
  }
}

export interface JinaReadResult {
  title: string;
  content: string;
}

export interface JinaSearchResult {
  title: string;
  url: string;
  snippet: string;
  content: string;
}

/**
 * Fetch URL content via Jina Reader API.
 * Returns markdown-rendered page content.
 */
export async function fetchUrlContent(
  url: string,
  signal?: AbortSignal,
): Promise<JinaReadResult> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-Return-Format': 'markdown',
  };
  const apiKey = getJinaApiKey();
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const response = await fetch(`https://r.jina.ai/${url}`, {
    method: 'GET',
    headers,
    signal,
  });

  if (!response.ok) {
    throw new Error(`Jina Reader error (${response.status}): ${response.statusText}`);
  }

  const data = await response.json();

  return {
    title: data.data?.title || new URL(url).hostname,
    content: data.data?.content || '',
  };
}

/**
 * Search the web via Jina Search API.
 * Requires a Jina API key (free tier at jina.ai).
 */
export async function searchWeb(
  query: string,
  signal?: AbortSignal,
): Promise<JinaSearchResult[]> {
  const apiKey = getJinaApiKey();
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const response = await fetch(`https://s.jina.ai/${encodeURIComponent(query)}`, {
    method: 'GET',
    headers,
    signal,
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Jina Search requires an API key. Get a free key at jina.ai and add it in the Sources panel.');
    }
    throw new Error(`Jina Search error (${response.status}): ${response.statusText}`);
  }

  const data = await response.json();
  const results: JinaSearchResult[] = (data.data || []).map(
    (item: { title?: string; url?: string; description?: string; content?: string }) => ({
      title: item.title || 'Untitled',
      url: item.url || '',
      snippet: item.description || '',
      content: item.content || item.description || '',
    }),
  );

  return results;
}
