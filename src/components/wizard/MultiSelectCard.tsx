import { useState, useCallback } from 'react';
import type { TreeNode, DimensionGroup, Dimension } from '@/types/tree';
import { callLLM } from '@/utils/llmClient';
import { CitationsList } from './CitationsList';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MultiSelectCardProps {
  node: TreeNode;
  problemTitle?: string;
  onSubmit: (selections: Record<string, string>) => void;
  stageColor: string;
  borderColor: string;
}

const STAGE_COLORS: Record<string, string> = {
  problem_definition: 'blue',
  metrics: 'purple',
  data: 'green',
  features: 'amber',
  model: 'red',
  training: 'orange',
  deployment: 'cyan',
  monitoring: 'pink',
};

export function MultiSelectCard({ node, problemTitle, onSubmit, borderColor }: MultiSelectCardProps) {
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [extraDimensions, setExtraDimensions] = useState<Dimension[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);

  const groups = node.dimensionGroups || [];
  const allDimensions = groups.flatMap(g => g.dimensions);
  const allRequired = allDimensions.length;
  const selectedCount = Object.keys(selections).filter(k =>
    allDimensions.some(d => d.id === k)
  ).length;
  const allSelected = selectedCount === allRequired;
  const isInterviewer = node.speaker === 'interviewer';
  const stageColor = STAGE_COLORS[node.stage] || 'gray';

  const handleSelect = (dimensionId: string, value: string) => {
    setSelections(prev => ({ ...prev, [dimensionId]: value }));
  };

  const handleSubmit = () => {
    if (allSelected) {
      onSubmit(selections);
    }
  };

  const handleSuggestMore = useCallback(async () => {
    setSuggestLoading(true);
    setSuggestError(null);

    const currentDims = allDimensions.map(d => d.label).join(', ');
    const prompt = `Given this ML system design problem: "${problemTitle || node.label}". Description: ${node.content.substring(0, 300)}

Current clarifying dimensions: ${currentDims}

Suggest 2-3 additional clarifying dimensions with 2-3 options each that would help scope this ML system design. Return ONLY valid JSON with this format:
[{"id": "unique_id", "label": "Dimension Name", "description": "Brief description", "options": [{"value": "val1", "label": "Option 1"}, {"value": "val2", "label": "Option 2"}]}]`;

    try {
      const answerText = await callLLM({
        systemPrompt: 'You are an ML system design expert. Return ONLY valid JSON.',
        userMessage: prompt,
        maxTokens: 800,
      });

      // Extract JSON from response
      const jsonMatch = answerText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error('Could not parse AI response');

      const parsed: Dimension[] = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('No dimensions received');

      // Add unique prefix to avoid ID collisions
      const newDims = parsed.map(d => ({ ...d, id: `llm_${d.id}` }));
      setExtraDimensions(prev => [...prev, ...newDims]);
    } catch (err) {
      setSuggestError(err instanceof Error ? err.message : 'Failed to get suggestions');
    } finally {
      setSuggestLoading(false);
    }
  }, [allDimensions, node, problemTitle]);

  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-lg shadow-lg dark:shadow-gray-900/50 border-l-4 overflow-hidden"
      style={{ borderLeftColor: borderColor }}
    >
      <div className="p-3 sm:p-4 md:p-6">
        {/* Speaker Label */}
        <div className="mb-4">
          <span
            className={`
              inline-flex items-center px-3 py-1 rounded-full text-sm font-medium
              ${isInterviewer ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'}
            `}
          >
            {isInterviewer ? (
              <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
              </svg>
            )}
            {isInterviewer ? 'Interviewer' : 'Candidate'}
          </span>
        </div>

        {/* Content */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">{node.label}</h3>
          <div className="text-gray-700 dark:text-gray-300 leading-relaxed prose prose-sm max-w-none overflow-x-auto break-words">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{node.content}</ReactMarkdown>
          </div>
          <CitationsList citations={node.citations} />
        </div>

        {/* Multi-select icon badge */}
        <div className="mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
            Select one option for each dimension ({selectedCount}/{allRequired})
          </span>
        </div>

        {/* Dimension Groups */}
        <div className="space-y-6">
          {groups.map((group: DimensionGroup) => (
            <div key={group.id}>
              <h4 className={`text-sm font-bold uppercase tracking-wider mb-3 text-${stageColor}-600`}>
                {group.label}
              </h4>
              <div className="space-y-4">
                {group.dimensions.map((dim: Dimension) => (
                  <DimensionSelector
                    key={dim.id}
                    dimension={dim}
                    selected={selections[dim.id]}
                    onSelect={(value) => handleSelect(dim.id, value)}
                  />
                ))}
              </div>
            </div>
          ))}

          {/* Extra LLM-suggested dimensions (informational only) */}
          {extraDimensions.length > 0 && (
            <div>
              <h4 className="text-sm font-bold uppercase tracking-wider mb-3 text-gray-500 dark:text-gray-400">
                Additional Considerations (Informational)
              </h4>
              <div className="space-y-4">
                {extraDimensions.map((dim: Dimension) => (
                  <DimensionSelector
                    key={dim.id}
                    dimension={dim}
                    selected={selections[dim.id]}
                    onSelect={(value) => handleSelect(dim.id, value)}
                    informational
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Suggest More Questions Button */}
        <div className="mt-4">
          <button
            onClick={handleSuggestMore}
            disabled={suggestLoading}
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {suggestLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                Thinking...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Suggest More Questions
              </>
            )}
          </button>
          {suggestError && (
            <p className="text-xs text-red-500 mt-1">{suggestError}</p>
          )}
        </div>

        {/* Continue Button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={!allSelected}
            className={`
              px-6 py-3 font-medium rounded-lg transition-colors duration-200 flex items-center gap-2
              min-h-14 text-base
              ${allSelected
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'}
            `}
          >
            Continue
            <svg className="w-5 h-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

interface DimensionSelectorProps {
  dimension: Dimension;
  selected?: string;
  onSelect: (value: string) => void;
  informational?: boolean;
}

function DimensionSelector({ dimension, selected, onSelect, informational }: DimensionSelectorProps) {
  return (
    <div className={`rounded-lg border p-4 ${informational ? 'border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900' : 'border-gray-200 dark:border-gray-700'}`}>
      <div className="mb-2">
        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{dimension.label}</span>
        {dimension.description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{dimension.description}</p>
        )}
        {informational && (
          <span className="text-xs text-gray-400 dark:text-gray-500 italic ml-2">(does not affect routing)</span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {dimension.options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onSelect(opt.value)}
            className={`
              px-4 py-2.5 text-sm font-medium rounded-lg border transition-all duration-200
              min-h-11
              ${selected === opt.value
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-gray-600'}
            `}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// Export for use in LLM "Add Questions" feature
export type { MultiSelectCardProps };
export { DimensionSelector };
