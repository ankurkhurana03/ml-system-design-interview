import { describe, it, expect } from 'vitest';
import {
  buildSourceContext,
  injectSourcesIntoPrompt,
  extractCitationsFromText,
  generateSearchQueries,
  MAX_SOURCE_CHARS,
  MAX_PER_SOURCE_CHARS,
} from '@/utils/sourceInjection';
import type { UserSource } from '@/types/tree';

function makeSource(overrides: Partial<UserSource> = {}): UserSource {
  return {
    id: '1',
    type: 'text',
    title: 'Test Source',
    content: 'Some content about ML systems.',
    addedAt: new Date().toISOString(),
    charCount: 30,
    ...overrides,
  };
}

describe('sourceInjection', () => {
  describe('buildSourceContext', () => {
    it('returns empty string for no sources', () => {
      expect(buildSourceContext([])).toBe('');
    });

    it('formats a single text source', () => {
      const result = buildSourceContext([makeSource()]);
      expect(result).toContain('[1] "Test Source"');
      expect(result).toContain('Some content about ML systems.');
      expect(result).not.toContain('URL:');
    });

    it('formats a URL source with URL line', () => {
      const result = buildSourceContext([
        makeSource({ type: 'url', url: 'https://example.com/article', title: 'Article' }),
      ]);
      expect(result).toContain('[1] "Article"');
      expect(result).toContain('URL: https://example.com/article');
    });

    it('numbers multiple sources sequentially', () => {
      const result = buildSourceContext([
        makeSource({ id: '1', title: 'First' }),
        makeSource({ id: '2', title: 'Second' }),
      ]);
      expect(result).toContain('[1] "First"');
      expect(result).toContain('[2] "Second"');
    });

    it('truncates per-source content exceeding MAX_PER_SOURCE_CHARS', () => {
      const longContent = 'x'.repeat(MAX_PER_SOURCE_CHARS + 100);
      const result = buildSourceContext([
        makeSource({ content: longContent, charCount: longContent.length }),
      ]);
      expect(result.length).toBeLessThan(longContent.length);
      expect(result).toContain('...');
    });

    it('prefers summary for long content', () => {
      const longContent = 'x'.repeat(MAX_PER_SOURCE_CHARS + 100);
      const result = buildSourceContext([
        makeSource({
          content: longContent,
          summary: 'Short summary',
          charCount: longContent.length,
        }),
      ]);
      expect(result).toContain('Short summary');
      expect(result).not.toContain('xxxx');
    });

    it('respects total character budget', () => {
      const sources = Array.from({ length: 10 }, (_, i) =>
        makeSource({
          id: String(i),
          title: `Source ${i}`,
          content: 'a'.repeat(2000),
          charCount: 2000,
        }),
      );
      const result = buildSourceContext(sources);
      // Total content should be within budget (plus some overhead for formatting)
      const totalContent = sources.reduce((s, _) => s + 2000, 0);
      expect(result.length).toBeLessThan(totalContent);
    });
  });

  describe('injectSourcesIntoPrompt', () => {
    it('returns original prompt for no sources', () => {
      const prompt = 'You are an assistant.';
      expect(injectSourcesIntoPrompt(prompt, [])).toBe(prompt);
    });

    it('appends source context and citation instructions', () => {
      const prompt = 'You are an assistant.';
      const result = injectSourcesIntoPrompt(prompt, [makeSource()]);
      expect(result).toContain('You are an assistant.');
      expect(result).toContain('REFERENCE SOURCES');
      expect(result).toContain('cite them inline as [1], [2]');
      expect(result).toContain('[1] "Test Source"');
    });
  });

  describe('extractCitationsFromText', () => {
    it('returns empty array for text without citations', () => {
      expect(extractCitationsFromText('No citations here.', [makeSource()])).toEqual([]);
    });

    it('extracts single citation', () => {
      const sources = [makeSource({ id: 'a', title: 'Source A' })];
      const result = extractCitationsFromText('According to [1], this is true.', sources);
      expect(result).toHaveLength(1);
      expect(result[0].index).toBe(1);
      expect(result[0].source.title).toBe('Source A');
    });

    it('extracts multiple citations and deduplicates', () => {
      const sources = [
        makeSource({ id: 'a', title: 'Source A' }),
        makeSource({ id: 'b', title: 'Source B' }),
      ];
      const text = 'See [1] and [2]. Also [1] again.';
      const result = extractCitationsFromText(text, sources);
      expect(result).toHaveLength(2);
      expect(result[0].index).toBe(1);
      expect(result[1].index).toBe(2);
    });

    it('ignores citations beyond source count', () => {
      const sources = [makeSource()];
      const text = 'See [1] and [5].';
      const result = extractCitationsFromText(text, sources);
      expect(result).toHaveLength(1);
      expect(result[0].index).toBe(1);
    });

    it('sorts citations by index', () => {
      const sources = [
        makeSource({ id: 'a', title: 'First' }),
        makeSource({ id: 'b', title: 'Second' }),
        makeSource({ id: 'c', title: 'Third' }),
      ];
      const text = '[3] then [1] then [2].';
      const result = extractCitationsFromText(text, sources);
      expect(result.map(c => c.index)).toEqual([1, 2, 3]);
    });
  });

  describe('generateSearchQueries', () => {
    it('generates 2 queries without stage', () => {
      const queries = generateSearchQueries('Fraud Detection', 'Build a system to detect fraudulent transactions in real-time');
      expect(queries.length).toBeGreaterThanOrEqual(2);
      expect(queries[0]).toBe('Fraud Detection ML system design');
      expect(queries[1]).toContain('Fraud Detection');
    });

    it('generates 3 queries with stage', () => {
      const queries = generateSearchQueries('Fraud Detection', 'Build a fraud detection system', 'feature_engineering');
      expect(queries.length).toBe(3);
      expect(queries[2]).toContain('feature engineering');
      expect(queries[2]).toContain('best practices');
    });

    it('skips short description query', () => {
      const queries = generateSearchQueries('Test', 'Short');
      // "Short" has <=10 chars after splitting, so only 1 query
      expect(queries.length).toBe(1);
    });
  });
});
