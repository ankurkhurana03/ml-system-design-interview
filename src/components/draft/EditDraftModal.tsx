import { useState, useEffect, useRef } from 'react';
import { stringify } from 'yaml';
import type { Problem, TreeNode, MLStage } from '@/types/tree';
import { parseYaml } from '@/utils/yamlLoader';
import { validateTree } from '@/utils/validateTree';

interface EditDraftModalProps {
  isOpen: boolean;
  onClose: () => void;
  problem: Problem;
  onSave: (updated: Problem) => void;
  onDelete: (id: string) => void;
}

type Tab = 'details' | 'content' | 'yaml';

const STAGE_LABELS: Record<MLStage, string> = {
  problem_definition: 'Problem Definition',
  metrics: 'Metrics',
  data: 'Data',
  features: 'Features',
  model: 'Model',
  training: 'Training',
  deployment: 'Deployment',
  monitoring: 'Monitoring',
};

const STAGE_COLORS: Record<MLStage, string> = {
  problem_definition: 'border-blue-400 bg-blue-50',
  metrics: 'border-purple-400 bg-purple-50',
  data: 'border-green-400 bg-green-50',
  features: 'border-amber-400 bg-amber-50',
  model: 'border-red-400 bg-red-50',
  training: 'border-orange-400 bg-orange-50',
  deployment: 'border-cyan-400 bg-cyan-50',
  monitoring: 'border-pink-400 bg-pink-50',
};

const STAGE_ORDER: MLStage[] = [
  'problem_definition', 'metrics', 'data', 'features',
  'model', 'training', 'deployment', 'monitoring',
];

export function EditDraftModal({ isOpen, onClose, problem, onSave, onDelete }: EditDraftModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('details');
  const [title, setTitle] = useState(problem.title);
  const [description, setDescription] = useState(problem.description);
  const [yamlText, setYamlText] = useState(() => stringify(problem));
  const [yamlError, setYamlError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Content editing state: mutable copy of nodes
  const [editedNodes, setEditedNodes] = useState<TreeNode[]>(() => structuredClone(problem.nodes));
  const [expandedNodeId, setExpandedNodeId] = useState<string | null>(null);
  const [contentFilter, setContentFilter] = useState<MLStage | 'all'>('all');

  // Reset state when problem changes
  useEffect(() => {
    setTitle(problem.title);
    setDescription(problem.description);
    setYamlText(stringify(problem));
    setYamlError(null);
    setEditedNodes(structuredClone(problem.nodes));
    setExpandedNodeId(null);
    setContentFilter('all');
    setActiveTab('details');
    setShowDeleteConfirm(false);
  }, [problem]);

  if (!isOpen) return null;

  const handleSaveDetails = () => {
    if (!title.trim() || !description.trim()) return;
    const updated: Problem = {
      ...problem,
      title: title.trim(),
      description: description.trim(),
    };
    onSave(updated);
    onClose();
  };

  const handleSaveContent = () => {
    const updated: Problem = {
      ...problem,
      title: title.trim() || problem.title,
      description: description.trim() || problem.description,
      nodes: editedNodes,
    };
    onSave(updated);
    onClose();
  };

  const handleSaveYaml = () => {
    try {
      const parsed = parseYaml(yamlText);
      const errors = validateTree(parsed);
      if (errors.length > 0) {
        setYamlError(`Validation errors:\n${errors.join('\n')}`);
        return;
      }
      const updated: Problem = { ...parsed, id: problem.id };
      onSave(updated);
      onClose();
    } catch (err) {
      setYamlError(err instanceof Error ? err.message : 'Failed to parse YAML');
    }
  };

  const handleSave = () => {
    if (activeTab === 'details') handleSaveDetails();
    else if (activeTab === 'content') handleSaveContent();
    else handleSaveYaml();
  };

  const handleDelete = () => {
    setShowDeleteConfirm(false);
    onDelete(problem.id);
  };

  const updateNode = (nodeId: string, updates: Partial<TreeNode>) => {
    setEditedNodes(prev => prev.map(n => n.id === nodeId ? { ...n, ...updates } : n));
  };

  const updateChoiceLabel = (nodeId: string, choiceIndex: number, label: string) => {
    setEditedNodes(prev => prev.map(n => {
      if (n.id !== nodeId || !n.choices) return n;
      const newChoices = n.choices.map((c, i) => i === choiceIndex ? { ...c, label } : c);
      return { ...n, choices: newChoices };
    }));
  };

  const updateChoiceAnswer = (nodeId: string, choiceIndex: number, answer: string) => {
    setEditedNodes(prev => prev.map(n => {
      if (n.id !== nodeId || !n.choices) return n;
      const newChoices = n.choices.map((c, i) => i === choiceIndex ? { ...c, answer } : c);
      return { ...n, choices: newChoices };
    }));
  };

  // Group nodes by stage for the content view
  const groupedNodes = STAGE_ORDER
    .map(stage => ({
      stage,
      nodes: editedNodes.filter(n => n.stage === stage),
    }))
    .filter(g => g.nodes.length > 0);

  const filteredGroups = contentFilter === 'all'
    ? groupedNodes
    : groupedNodes.filter(g => g.stage === contentFilter);

  const isSaveDisabled = activeTab === 'details' && (!title.trim() || !description.trim());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 shadow-2xl w-full h-full md:rounded-xl md:max-w-3xl md:max-h-[85vh] md:h-auto flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Edit Draft</h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 px-6">
          <button
            onClick={() => setActiveTab('details')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'details'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Details
          </button>
          <button
            onClick={() => setActiveTab('content')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'content'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Content ({editedNodes.length})
          </button>
          <button
            onClick={() => {
              // Sync current edits into YAML when switching to that tab
              const synced: Problem = {
                ...problem,
                title: title.trim() || problem.title,
                description: description.trim() || problem.description,
                nodes: editedNodes,
              };
              setYamlText(stringify(synced));
              setYamlError(null);
              setActiveTab('yaml');
            }}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'yaml'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            YAML
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {activeTab === 'details' && (
            <div className="space-y-4">
              <div>
                <label htmlFor="draft-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  id="draft-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Problem title"
                />
              </div>
              <div>
                <label htmlFor="draft-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="draft-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Problem description"
                />
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {problem.nodes.length} nodes | Root: {problem.root}
              </div>
            </div>
          )}

          {activeTab === 'content' && (
            <div className="space-y-4">
              {/* Stage filter */}
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setContentFilter('all')}
                  className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
                    contentFilter === 'all'
                      ? 'bg-gray-800 dark:bg-gray-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  All ({editedNodes.length})
                </button>
                {groupedNodes.map(({ stage, nodes }) => (
                  <button
                    key={stage}
                    onClick={() => setContentFilter(stage)}
                    className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
                      contentFilter === stage
                        ? 'bg-gray-800 dark:bg-gray-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {STAGE_LABELS[stage]} ({nodes.length})
                  </button>
                ))}
              </div>

              {/* Node list grouped by stage */}
              {filteredGroups.map(({ stage, nodes }) => (
                <div key={stage}>
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                    {STAGE_LABELS[stage]}
                  </h3>
                  <div className="space-y-2">
                    {nodes.map(node => (
                      <NodeEditor
                        key={node.id}
                        node={node}
                        stageColor={STAGE_COLORS[stage]}
                        isExpanded={expandedNodeId === node.id}
                        onToggle={() => setExpandedNodeId(expandedNodeId === node.id ? null : node.id)}
                        onUpdateLabel={(label) => updateNode(node.id, { label })}
                        onUpdateContent={(content) => updateNode(node.id, { content })}
                        onUpdateChoiceLabel={(idx, label) => updateChoiceLabel(node.id, idx, label)}
                        onUpdateChoiceAnswer={(idx, answer) => updateChoiceAnswer(node.id, idx, answer)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'yaml' && (
            <div className="space-y-3">
              <textarea
                value={yamlText}
                onChange={(e) => { setYamlText(e.target.value); setYamlError(null); }}
                className="w-full h-96 px-3 py-2 font-mono text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                spellCheck={false}
              />
              {yamlError && (
                <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-800 dark:text-red-300 whitespace-pre-wrap">{yamlError}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
          >
            Delete Draft
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaveDisabled}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save
            </button>
          </div>
        </div>

        {/* Delete Confirmation */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl">
            <div className="absolute inset-0 bg-black/30 rounded-xl" onClick={() => setShowDeleteConfirm(false)} />
            <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-sm w-full mx-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Delete Draft?</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                This will permanently delete &quot;{problem.title}&quot;. This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Node Editor (collapsible card per node) ─────────────────────────────

interface NodeEditorProps {
  node: TreeNode;
  stageColor: string;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdateLabel: (label: string) => void;
  onUpdateContent: (content: string) => void;
  onUpdateChoiceLabel: (index: number, label: string) => void;
  onUpdateChoiceAnswer: (index: number, answer: string) => void;
}

function NodeEditor({
  node,
  stageColor,
  isExpanded,
  onToggle,
  onUpdateLabel,
  onUpdateContent,
  onUpdateChoiceLabel,
  onUpdateChoiceAnswer,
}: NodeEditorProps) {
  const contentRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (isExpanded && contentRef.current) {
      const el = contentRef.current;
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [isExpanded, node.content]);

  const typeLabel = node.type === 'question' ? 'Q' : node.type === 'multi_select' ? 'MS' : node.type === 'terminal' ? 'T' : 'i';
  const typeBg = node.type === 'question' ? 'bg-blue-600' : node.type === 'terminal' ? 'bg-gray-600' : node.type === 'multi_select' ? 'bg-purple-600' : 'bg-green-600';

  return (
    <div className={`border-l-3 rounded-lg border ${stageColor} overflow-hidden`}>
      {/* Collapsed header — always visible */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      >
        <span className={`${typeBg} text-white text-xs font-bold w-5 h-5 rounded flex items-center justify-center shrink-0`}>
          {typeLabel}
        </span>
        <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate flex-1">
          {node.label}
        </span>
        <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">{node.id}</span>
        <svg
          className={`w-4 h-4 text-gray-400 dark:text-gray-500 transition-transform shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded editor */}
      {isExpanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-gray-100 dark:border-gray-700">
          {/* Label */}
          <div className="pt-3">
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Label</label>
            <input
              type="text"
              value={node.label}
              onChange={(e) => onUpdateLabel(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Content */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
              Content
              <span className="font-normal text-gray-400 dark:text-gray-500 ml-1">({node.content.length} chars)</span>
            </label>
            <textarea
              ref={contentRef}
              value={node.content}
              onChange={(e) => {
                onUpdateContent(e.target.value);
                // Auto-resize
                e.target.style.height = 'auto';
                e.target.style.height = `${e.target.scrollHeight}px`;
              }}
              className="w-full px-2.5 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none min-h-[60px]"
              rows={3}
            />
          </div>

          {/* Choices (for question nodes) */}
          {node.type === 'question' && node.choices && node.choices.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                Choices ({node.choices.length})
              </label>
              <div className="space-y-2">
                {node.choices.map((choice, idx) => (
                  <div key={idx} className="bg-gray-50 dark:bg-gray-700 rounded p-2 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-400 dark:text-gray-500 w-4 shrink-0">{idx + 1}.</span>
                      <input
                        type="text"
                        value={choice.label}
                        onChange={(e) => onUpdateChoiceLabel(idx, e.target.value)}
                        className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm font-medium bg-white dark:bg-gray-600 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Choice label"
                      />
                      <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0" title={`Next: ${choice.next}`}>
                        → {choice.next}
                      </span>
                    </div>
                    <ChoiceAnswerEditor
                      answer={choice.answer}
                      onChange={(answer) => onUpdateChoiceAnswer(idx, answer)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Info: next pointer (read-only) */}
          {node.type === 'info' && node.next && (
            <div className="text-xs text-gray-400 dark:text-gray-500">
              Next → <span className="font-mono">{node.next}</span>
            </div>
          )}

          {/* Terminal badge */}
          {node.type === 'terminal' && (
            <div className="text-xs text-gray-400 dark:text-gray-500 italic">Terminal node (end of path)</div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Choice answer editor (auto-resizing textarea) ───────────────────────

function ChoiceAnswerEditor({ answer, onChange }: { answer: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = 'auto';
      ref.current.style.height = `${ref.current.scrollHeight}px`;
    }
  }, [answer]);

  return (
    <textarea
      ref={ref}
      value={answer}
      onChange={(e) => {
        onChange(e.target.value);
        e.target.style.height = 'auto';
        e.target.style.height = `${e.target.scrollHeight}px`;
      }}
      className="w-full ml-6 px-2 py-1 border border-gray-200 dark:border-gray-600 rounded text-xs bg-white dark:bg-gray-600 text-gray-600 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none min-h-[32px]"
      rows={1}
      placeholder="Answer/explanation text"
    />
  );
}
