/**
 * Source injection into LLM prompts and citation extraction.
 *
 * Formats user sources as numbered context blocks, injects them into system prompts,
 * and extracts [1], [2] style citations from LLM responses.
 */

import type { UserSource, ParsedCitation } from '@/types/tree';

export const MAX_SOURCE_CHARS = 12_000;    // ~3000 tokens total budget
export const MAX_PER_SOURCE_CHARS = 4_000; // ~1000 tokens per source

/**
 * Truncate source content to fit within per-source budget.
 * Prefers summary if available and content is over budget.
 */
function truncateContent(source: UserSource): string {
  const text = source.summary && source.content.length > MAX_PER_SOURCE_CHARS
    ? source.summary
    : source.content;

  if (text.length <= MAX_PER_SOURCE_CHARS) return text;
  return text.substring(0, MAX_PER_SOURCE_CHARS - 3) + '...';
}

/**
 * Build numbered source context block for injection into prompts.
 * Respects total and per-source character budgets.
 */
export function buildSourceContext(sources: UserSource[]): string {
  if (sources.length === 0) return '';

  const parts: string[] = [];
  let totalChars = 0;

  for (let i = 0; i < sources.length; i++) {
    const source = sources[i];
    const content = truncateContent(source);

    // Check if adding this source would exceed total budget
    if (totalChars + content.length > MAX_SOURCE_CHARS) {
      // Include as much as possible
      const remaining = MAX_SOURCE_CHARS - totalChars;
      if (remaining > 200) {
        const truncated = content.substring(0, remaining - 3) + '...';
        parts.push(formatSourceBlock(i + 1, source, truncated));
      }
      break;
    }

    parts.push(formatSourceBlock(i + 1, source, content));
    totalChars += content.length;
  }

  return parts.join('\n\n');
}

function formatSourceBlock(index: number, source: UserSource, content: string): string {
  const lines = [`[${index}] "${source.title}"`];
  if (source.url) {
    lines.push(`URL: ${source.url}`);
  }
  lines.push('---');
  lines.push(content);
  lines.push('---');
  return lines.join('\n');
}

/**
 * Wrap a system prompt with source context and citation instructions.
 * If no sources, returns the original prompt unchanged.
 */
export function injectSourcesIntoPrompt(systemPrompt: string, sources: UserSource[]): string {
  if (sources.length === 0) return systemPrompt;

  const sourceContext = buildSourceContext(sources);
  if (!sourceContext) return systemPrompt;

  return `${systemPrompt}

REFERENCE SOURCES (cite as [1], [2], etc. when using information from these):

${sourceContext}

When your response draws on these sources, cite them inline as [1], [2], etc.`;
}

/**
 * Extract [1], [2] etc. references from LLM response text and map to UserSource objects.
 * Returns only citations that have a matching source.
 */
export function extractCitationsFromText(text: string, sources: UserSource[]): ParsedCitation[] {
  const matches = text.matchAll(/\[(\d+)\]/g);
  const seen = new Set<number>();
  const citations: ParsedCitation[] = [];

  for (const match of matches) {
    const index = parseInt(match[1], 10);
    if (seen.has(index)) continue;
    seen.add(index);

    // Citations are 1-based, sources array is 0-based
    const source = sources[index - 1];
    if (source) {
      citations.push({ index, source });
    }
  }

  // Sort by index
  citations.sort((a, b) => a.index - b.index);
  return citations;
}

/**
 * Generate deterministic search queries from problem context.
 * Returns 2-3 queries for web search.
 */
export function generateSearchQueries(
  title: string,
  description: string,
  stage?: string,
): string[] {
  const queries: string[] = [];

  // Query 1: Title + ML system design
  queries.push(`${title} ML system design`);

  // Query 2: Title + first meaningful words of description
  const descWords = description.split(/\s+/).slice(0, 5).join(' ');
  if (descWords.length > 10) {
    queries.push(`${title} ${descWords}`);
  }

  // Query 3: Stage-specific (if provided)
  if (stage) {
    const stageLabel = stage.replace(/_/g, ' ');
    queries.push(`${title} ${stageLabel} best practices`);
  }

  return queries;
}
