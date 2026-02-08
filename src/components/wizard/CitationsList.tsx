import { useState } from 'react';
import type { ParsedCitation } from '@/types/tree';

interface CitationsListProps {
  citations?: string[];
  sourceCitations?: ParsedCitation[];
}

/** Truncate a URL for display: show domain + truncated path (max 60 chars). */
function truncateUrl(url: string, maxLen: number = 60): string {
  try {
    const parsed = new URL(url);
    const display = parsed.hostname + parsed.pathname;
    if (display.length <= maxLen) return display;
    return display.substring(0, maxLen - 3) + '...';
  } catch {
    // Not a valid URL, truncate raw string
    if (url.length <= maxLen) return url;
    return url.substring(0, maxLen - 3) + '...';
  }
}

export function CitationsList({ citations, sourceCitations }: CitationsListProps) {
  const [expanded, setExpanded] = useState(false);

  const hasUrlCitations = citations && citations.length > 0;
  const hasSourceCitations = sourceCitations && sourceCitations.length > 0;

  if (!hasUrlCitations && !hasSourceCitations) return null;

  const COLLAPSE_THRESHOLD = 5;

  return (
    <div className="mt-4 pt-3 border-t border-gray-200">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
        Sources
      </h4>

      {/* Source-grounded citations (numbered [1], [2] from user sources) */}
      {hasSourceCitations && (
        <ol className="list-none space-y-1 mb-2">
          {sourceCitations.map((citation) => (
            <li key={citation.index} className="text-xs text-gray-600 flex items-start gap-1.5">
              <span className="font-bold text-gray-500 flex-shrink-0">[{citation.index}]</span>
              <span>
                {citation.source.url ? (
                  <a
                    href={citation.source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                    title={citation.source.url}
                  >
                    {citation.source.title}
                  </a>
                ) : (
                  <span className="text-gray-700">{citation.source.title}</span>
                )}
              </span>
            </li>
          ))}
        </ol>
      )}

      {/* Raw URL citations (from Perplexity etc.) */}
      {hasUrlCitations && (
        <>
          {hasSourceCitations && (
            <h5 className="text-xs text-gray-400 mt-2 mb-1">Additional References</h5>
          )}
          <ol className="list-decimal list-inside space-y-1">
            {((() => {
              const shouldCollapse = citations.length > COLLAPSE_THRESHOLD;
              const visible = shouldCollapse && !expanded
                ? citations.slice(0, COLLAPSE_THRESHOLD)
                : citations;
              return visible;
            })()).map((url, index) => (
              <li key={index} className="text-xs text-gray-600">
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 hover:underline"
                  title={url}
                >
                  {truncateUrl(url)}
                </a>
              </li>
            ))}
          </ol>
          {citations.length > COLLAPSE_THRESHOLD && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-1 text-xs text-gray-500 hover:text-gray-700"
            >
              {expanded
                ? 'Show fewer'
                : `+${citations.length - COLLAPSE_THRESHOLD} more sources`}
            </button>
          )}
        </>
      )}
    </div>
  );
}
