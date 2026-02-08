/**
 * React hook for managing user sources per problem.
 * Provides CRUD, URL fetching via Jina, web search, and LLM summarization.
 */

import { useState, useEffect, useCallback } from 'react';
import type { UserSource } from '@/types/tree';
import {
  getSourcesForProblem,
  addSource as addSourceToStore,
  removeSource as removeSourceFromStore,
  clearSources as clearSourcesFromStore,
  updateSource as updateSourceInStore,
} from '@/utils/sourcesStore';
import { fetchUrlContent, searchWeb } from '@/utils/jinaClient';
import type { JinaSearchResult } from '@/utils/jinaClient';
import { callLLM } from '@/utils/llmClient';

export function useSources(problemId: string) {
  const [sources, setSources] = useState<UserSource[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<JinaSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Load sources when problemId changes
  useEffect(() => {
    setSources(getSourcesForProblem(problemId));
    setSearchResults([]);
    setError(null);
  }, [problemId]);

  const addUrl = useCallback(async (url: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchUrlContent(url);
      const source: UserSource = {
        id: crypto.randomUUID(),
        type: 'url',
        url,
        title: result.title,
        content: result.content,
        addedAt: new Date().toISOString(),
        charCount: result.content.length,
      };
      const updated = addSourceToStore(problemId, source);
      setSources(updated);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch URL';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [problemId]);

  const addText = useCallback((title: string, text: string) => {
    const source: UserSource = {
      id: crypto.randomUUID(),
      type: 'text',
      title,
      content: text,
      addedAt: new Date().toISOString(),
      charCount: text.length,
    };
    const updated = addSourceToStore(problemId, source);
    setSources(updated);
  }, [problemId]);

  const removeSource = useCallback((sourceId: string) => {
    const updated = removeSourceFromStore(problemId, sourceId);
    setSources(updated);
  }, [problemId]);

  const autoSearch = useCallback(async (query?: string) => {
    setSearchLoading(true);
    setError(null);
    try {
      const searchQuery = query || `${problemId} ML system design`;
      const results = await searchWeb(searchQuery);
      // Deduplicate by URL, exclude already-added sources
      const existingUrls = new Set(sources.filter(s => s.url).map(s => s.url));
      const deduplicated = results.filter(
        (r, i, arr) =>
          r.url &&
          !existingUrls.has(r.url) &&
          arr.findIndex(x => x.url === r.url) === i,
      );
      setSearchResults(deduplicated);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Search failed';
      setError(msg);
    } finally {
      setSearchLoading(false);
    }
  }, [problemId, sources]);

  const addSearchResult = useCallback(async (result: JinaSearchResult) => {
    setLoading(true);
    setError(null);
    try {
      // Fetch full content via Jina Reader for richer grounding
      let content = result.content;
      let title = result.title;
      try {
        const fetched = await fetchUrlContent(result.url);
        content = fetched.content || content;
        title = fetched.title || title;
      } catch {
        // Fall back to snippet from search
      }

      const source: UserSource = {
        id: crypto.randomUUID(),
        type: 'url',
        url: result.url,
        title,
        content,
        addedAt: new Date().toISOString(),
        charCount: content.length,
      };
      const updated = addSourceToStore(problemId, source);
      setSources(updated);
      // Remove from search results
      setSearchResults(prev => prev.filter(r => r.url !== result.url));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to add source';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [problemId]);

  const summarizeSource = useCallback(async (sourceId: string) => {
    const source = sources.find(s => s.id === sourceId);
    if (!source) return;

    setLoading(true);
    setError(null);
    try {
      const summary = await callLLM({
        systemPrompt: 'You are a concise summarizer. Summarize the following source material in 2-3 paragraphs, preserving key facts, methods, and recommendations. Focus on ML system design relevance.',
        userMessage: source.content.substring(0, 8000),
        maxTokens: 500,
      });
      const updated = updateSourceInStore(problemId, sourceId, { summary });
      setSources(updated);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Summarization failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [problemId, sources]);

  const clearAll = useCallback(() => {
    clearSourcesFromStore(problemId);
    setSources([]);
  }, [problemId]);

  return {
    sources,
    loading,
    error,
    searchResults,
    searchLoading,
    addUrl,
    addText,
    removeSource,
    autoSearch,
    addSearchResult,
    summarizeSource,
    clearSources: clearAll,
  };
}
