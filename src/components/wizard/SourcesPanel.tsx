/**
 * SourcesPanel — collapsible panel for managing user reference sources.
 * Similar pattern to NotesPanel. Allows adding URLs, text, auto-searching,
 * and shows a character budget bar.
 */

import { useState, useEffect } from 'react';
import type { UserSource } from '@/types/tree';
import type { JinaSearchResult } from '@/utils/jinaClient';
import { getJinaApiKey, saveJinaApiKey } from '@/utils/jinaClient';
import { MAX_SOURCE_CHARS } from '@/utils/sourceInjection';

interface SourcesPanelProps {
  isOpen: boolean;
  onClose: () => void;
  sources: UserSource[];
  loading: boolean;
  error: string | null;
  searchResults: JinaSearchResult[];
  searchLoading: boolean;
  onAddUrl: (url: string) => Promise<void>;
  onAddText: (title: string, text: string) => void;
  onRemoveSource: (sourceId: string) => void;
  onAutoSearch: (query?: string) => Promise<void>;
  onAddSearchResult: (result: JinaSearchResult) => Promise<void>;
  onSummarizeSource: (sourceId: string) => Promise<void>;
  onClearSources: () => void;
  problemTitle?: string;
}

type AddMode = null | 'url' | 'text';

export function SourcesPanel({
  isOpen,
  onClose,
  sources,
  loading,
  error,
  searchResults,
  searchLoading,
  onAddUrl,
  onAddText,
  onRemoveSource,
  onAutoSearch,
  onAddSearchResult,
  onSummarizeSource,
  onClearSources,
  problemTitle,
}: SourcesPanelProps) {
  const [addMode, setAddMode] = useState<AddMode>(null);
  const [urlInput, setUrlInput] = useState('');
  const [textTitle, setTextTitle] = useState('');
  const [textContent, setTextContent] = useState('');
  const [jinaKey, setJinaKey] = useState('');
  const [showJinaKey, setShowJinaKey] = useState(false);

  useEffect(() => {
    setJinaKey(getJinaApiKey());
  }, []);

  if (!isOpen) return null;

  const totalChars = sources.reduce((sum, s) => sum + s.charCount, 0);
  const budgetPercent = Math.min(100, Math.round((totalChars / MAX_SOURCE_CHARS) * 100));

  const handleAddUrl = async () => {
    const url = urlInput.trim();
    if (!url) return;
    await onAddUrl(url);
    setUrlInput('');
    setAddMode(null);
  };

  const handleAddText = () => {
    const title = textTitle.trim() || 'Untitled Source';
    const content = textContent.trim();
    if (!content) return;
    onAddText(title, content);
    setTextTitle('');
    setTextContent('');
    setAddMode(null);
  };

  const handleAutoSearch = () => {
    onAutoSearch(problemTitle ? `${problemTitle} ML system design` : undefined);
  };

  const truncateUrl = (url: string, max = 40) => {
    try {
      const parsed = new URL(url);
      const display = parsed.hostname + parsed.pathname;
      return display.length > max ? display.substring(0, max - 3) + '...' : display;
    } catch {
      return url.length > max ? url.substring(0, max - 3) + '...' : url;
    }
  };

  return (
    <div className="border-t border-gray-200 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <h3 className="text-sm font-semibold text-gray-700">Sources ({sources.length})</h3>
        </div>
        <div className="flex items-center gap-2">
          {sources.length > 0 && (
            <button
              onClick={onClearSources}
              className="text-xs px-2 py-1 text-red-600 hover:bg-red-50 rounded transition-colors"
              title="Clear all sources"
            >
              Clear
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
            title="Close Sources"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
        {/* Action Buttons */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setAddMode(addMode === 'url' ? null : 'url')}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
              addMode === 'url'
                ? 'bg-blue-600 text-white'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}
          >
            + URL
          </button>
          <button
            onClick={() => setAddMode(addMode === 'text' ? null : 'text')}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
              addMode === 'text'
                ? 'bg-blue-600 text-white'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}
          >
            + Text
          </button>
          <button
            onClick={handleAutoSearch}
            disabled={searchLoading}
            className="text-xs px-3 py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-1"
          >
            {searchLoading ? (
              <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            )}
            Auto-Search
          </button>
        </div>

        {/* Jina API Key (shown when no key + search fails, or toggled) */}
        {(showJinaKey || (!jinaKey && error?.includes('API key'))) && (
          <div className="flex gap-2 items-center">
            <input
              type="password"
              value={jinaKey}
              onChange={(e) => setJinaKey(e.target.value)}
              placeholder="Jina API key (free at jina.ai)"
              className="flex-1 text-xs border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono"
            />
            <button
              onClick={() => {
                saveJinaApiKey(jinaKey.trim());
                setShowJinaKey(false);
              }}
              disabled={!jinaKey.trim()}
              className="px-2 py-1.5 text-xs font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              Save
            </button>
          </div>
        )}
        {jinaKey && !showJinaKey && (
          <button
            onClick={() => setShowJinaKey(true)}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            Jina key: ****{jinaKey.slice(-4)} (edit)
          </button>
        )}

        {/* URL Input */}
        {addMode === 'url' && (
          <div className="flex gap-2">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddUrl(); }}
              placeholder="https://example.com/article"
              className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
            <button
              onClick={handleAddUrl}
              disabled={!urlInput.trim() || loading}
              className="px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-1"
            >
              {loading ? (
                <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : null}
              Fetch
            </button>
          </div>
        )}

        {/* Text Input */}
        {addMode === 'text' && (
          <div className="space-y-2">
            <input
              type="text"
              value={textTitle}
              onChange={(e) => setTextTitle(e.target.value)}
              placeholder="Source title (optional)"
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
            <textarea
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder="Paste reference text here..."
              className="w-full h-24 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
            <button
              onClick={handleAddText}
              disabled={!textContent.trim()}
              className="px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              Add Text Source
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        {/* Source List */}
        {sources.length > 0 && (
          <div className="space-y-2">
            {sources.map((source, idx) => (
              <div key={source.id} className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
                <span className="text-xs font-bold text-gray-500 mt-0.5 flex-shrink-0 w-5 text-center">
                  [{idx + 1}]
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs">
                      {source.type === 'url' ? '\uD83D\uDD17' : '\uD83D\uDCDD'}
                    </span>
                    <span className="text-sm font-medium text-gray-800 truncate">
                      {source.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {source.url && (
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline truncate"
                      >
                        {truncateUrl(source.url)}
                      </a>
                    )}
                    <span className="text-xs text-gray-400">
                      {source.charCount.toLocaleString()} chars
                    </span>
                    {source.charCount > 4000 && !source.summary && (
                      <button
                        onClick={() => onSummarizeSource(source.id)}
                        disabled={loading}
                        className="text-xs text-purple-600 hover:text-purple-800 font-medium"
                      >
                        Summarize
                      </button>
                    )}
                    {source.summary && (
                      <span className="text-xs text-green-600 font-medium">Summarized</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => onRemoveSource(source.id)}
                  className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors flex-shrink-0"
                  title="Remove source"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Search Results
            </h4>
            {searchResults.slice(0, 5).map((result, idx) => (
              <div key={idx} className="flex items-start gap-2 p-2 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800 truncate">{result.title}</div>
                  <div className="text-xs text-gray-600 line-clamp-2 mt-0.5">{result.snippet}</div>
                  {result.url && (
                    <div className="text-xs text-gray-400 truncate mt-0.5">{truncateUrl(result.url)}</div>
                  )}
                </div>
                <button
                  onClick={() => onAddSearchResult(result)}
                  disabled={loading}
                  className="text-xs px-2 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors disabled:opacity-50 flex-shrink-0"
                >
                  + Add
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Budget Bar */}
        {sources.length > 0 && (
          <div className="pt-2 border-t border-gray-200">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>Budget</span>
              <span>{totalChars.toLocaleString()} / {MAX_SOURCE_CHARS.toLocaleString()} chars</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  budgetPercent > 90 ? 'bg-red-500' : budgetPercent > 70 ? 'bg-amber-500' : 'bg-blue-500'
                }`}
                style={{ width: `${budgetPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
