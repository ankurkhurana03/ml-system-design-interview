import { useState, useMemo } from 'react';
import { stringify, parse } from 'yaml';
import type { Problem, TreeNode } from '@/types/tree';
import { mergeBranch, type EditType } from '@/utils/mergeBranch';
import { callLLM } from '@/utils/llmClient';

interface BranchEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBranchGenerated: (updatedProblem: Problem) => void;
  problem: Problem;
  targetNodeId: string;
  editType: EditType;
}

type GenerationStatus = 'idle' | 'generating' | 'parsing' | 'merging' | 'preview' | 'success' | 'error';

export function BranchEditModal({
  isOpen,
  onClose,
  onBranchGenerated,
  problem,
  targetNodeId,
  editType,
}: BranchEditModalProps) {
  const [userPrompt, setUserPrompt] = useState('');
  const [choiceLabel, setChoiceLabel] = useState('');
  const [status, setStatus] = useState<GenerationStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [newNodes, setNewNodes] = useState<TreeNode[]>([]);
  const [mergedProblem, setMergedProblem] = useState<Problem | null>(null);

  // Get the target node
  const targetNode = useMemo(() => {
    return problem.nodes.find((n) => n.id === targetNodeId);
  }, [problem, targetNodeId]);

  // Get placeholder and label text based on edit type
  const { placeholder, modalTitle, promptLabel } = useMemo(() => {
    switch (editType) {
      case 'add-choice':
        return {
          placeholder: 'e.g., "Hybrid approach combining collaborative and content-based filtering"',
          modalTitle: 'Add New Choice',
          promptLabel: 'Choice Label',
        };
      case 'add-decision':
        return {
          placeholder: 'e.g., "Alternative data source"',
          modalTitle: 'Add Decision Point',
          promptLabel: 'New Branch Label',
        };
      case 'continue':
        return {
          placeholder: 'e.g., "Explore advanced monitoring techniques"',
          modalTitle: 'Continue Interview',
          promptLabel: 'Continuation Topic',
        };
    }
  }, [editType]);

  if (!isOpen) return null;

  const extractYaml = (text: string): string => {
    const yamlBlockMatch = text.match(/```ya?ml\n([\s\S]*?)\n```/);
    if (yamlBlockMatch) return yamlBlockMatch[1];
    const codeBlockMatch = text.match(/```\n([\s\S]*?)\n```/);
    if (codeBlockMatch) return codeBlockMatch[1];
    return text;
  };

  const handleGenerate = async () => {
    if (!choiceLabel.trim() && editType !== 'continue') {
      setError('Please enter a choice label');
      return;
    }

    if (!userPrompt.trim() && editType === 'continue') {
      setError('Please enter a continuation topic');
      return;
    }

    setStatus('generating');
    setError(null);

    try {
      const existingYaml = stringify(problem);

      const yamlContent = await callLLM({
        systemPrompt: `You are an expert ML system design interviewer. Generate NEW branch nodes to extend an existing decision tree.

RULES:
1. Generate ONLY new nodes (not the entire tree)
2. Use unique IDs with a "gen_" prefix (e.g., "gen_data_1")
3. Continue from the target node's stage through remaining stages
4. End with a terminal node in the monitoring stage
5. Output ONLY a YAML array of nodes

YAML FORMAT:
\`\`\`yaml
- id: gen_data_1
  stage: data
  type: info
  label: Data Strategy
  speaker: interviewer
  content: "..."
  next: gen_features_1
- id: gen_features_1
  stage: features
  type: question
  label: Feature Selection
  speaker: candidate
  content: "..."
  choices:
    - label: Option A
      answer: "..."
      next: gen_model_1
    - label: Option B
      answer: "..."
      next: gen_model_1
\`\`\``,
        userMessage: `Existing tree YAML:\n\`\`\`yaml\n${existingYaml}\n\`\`\`\n\nTarget node ID: ${targetNodeId}\nTarget node stage: ${targetNode?.stage}\nUser request: ${choiceLabel || userPrompt}\n\nGenerate ONLY the new branch nodes as a YAML array.`,
        maxTokens: 8000,
      });

      setStatus('parsing');
      const extractedYaml = extractYaml(yamlContent);

      let parsedNodes: TreeNode[];
      try {
        const parsed = parse(extractedYaml);
        if (Array.isArray(parsed)) {
          parsedNodes = parsed;
        } else if (parsed.nodes && Array.isArray(parsed.nodes)) {
          parsedNodes = parsed.nodes;
        } else {
          throw new Error('Expected YAML array of nodes');
        }
      } catch (parseError) {
        throw new Error(`Failed to parse YAML: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
      }

      if (parsedNodes.length === 0) {
        throw new Error('No nodes generated');
      }

      setStatus('merging');
      const merged = mergeBranch({
        existingProblem: problem,
        newNodes: parsedNodes,
        targetNodeId,
        editType,
        choiceLabel: choiceLabel || userPrompt,
        choiceAnswer: userPrompt || `Exploring: ${choiceLabel}`,
      });

      setNewNodes(parsedNodes);
      setMergedProblem(merged);
      setStatus('preview');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Failed to generate branch');
    }
  };

  const handleAccept = () => {
    if (mergedProblem) {
      setStatus('success');
      setTimeout(() => {
        onBranchGenerated(mergedProblem);
        handleClose();
      }, 300);
    }
  };

  const handleDiscard = () => {
    setStatus('idle');
    setNewNodes([]);
    setMergedProblem(null);
    setError(null);
  };

  const handleClose = () => {
    if (status === 'generating' || status === 'parsing' || status === 'merging') {
      return;
    }
    setUserPrompt('');
    setChoiceLabel('');
    setNewNodes([]);
    setMergedProblem(null);
    setError(null);
    setStatus('idle');
    onClose();
  };

  const getStatusText = () => {
    switch (status) {
      case 'generating':
        return 'Generating new branch...';
      case 'parsing':
        return 'Parsing nodes...';
      case 'merging':
        return 'Merging with existing tree...';
      case 'success':
        return 'Branch added successfully!';
      case 'error':
        return 'Error';
      default:
        return '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {modalTitle}
          </h2>
          {targetNode && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              From: {targetNode.label} ({targetNode.stage})
            </p>
          )}
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-4 max-h-[calc(90vh-200px)] overflow-y-auto">
          {status !== 'preview' ? (
            <>
              {/* Choice label input (for add-choice and add-decision) */}
              {(editType === 'add-choice' || editType === 'add-decision') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {promptLabel}
                  </label>
                  <input
                    type="text"
                    value={choiceLabel}
                    onChange={(e) => setChoiceLabel(e.target.value)}
                    placeholder={placeholder}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    disabled={status === 'generating' || status === 'parsing' || status === 'merging'}
                  />
                </div>
              )}

              {/* User prompt / description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={userPrompt}
                  onChange={(e) => setUserPrompt(e.target.value)}
                  placeholder="Add more details about what this branch should explore..."
                  className="w-full h-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white resize-none"
                  disabled={status === 'generating' || status === 'parsing' || status === 'merging'}
                />
              </div>
            </>
          ) : (
            /* Preview of new nodes */
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Preview: {newNodes.length} new node{newNodes.length !== 1 ? 's' : ''}
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {newNodes.map((node, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-gray-50 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {node.label}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                        {node.stage}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                      {node.content}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status indicator */}
          {(status === 'generating' || status === 'parsing' || status === 'merging' || status === 'success') && (
            <div className="flex items-center space-x-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-md">
              {status !== 'success' && (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 dark:border-blue-400" />
              )}
              {status === 'success' && (
                <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
              <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                {getStatusText()}
              </span>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-md">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
          {status === 'preview' ? (
            <>
              <button
                onClick={handleDiscard}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Discard
              </button>
              <button
                onClick={handleAccept}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                Accept & Add
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleClose}
                disabled={status === 'generating' || status === 'parsing' || status === 'merging'}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              {status === 'error' && (
                <button
                  onClick={handleGenerate}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Retry
                </button>
              )}
              {status !== 'error' && (
                <button
                  onClick={handleGenerate}
                  disabled={
                    (!choiceLabel.trim() && editType !== 'continue') ||
                    (!userPrompt.trim() && editType === 'continue') ||
                    status === 'generating' ||
                    status === 'parsing' ||
                    status === 'merging'
                  }
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Generate
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
