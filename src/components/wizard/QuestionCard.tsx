import { useState } from 'react';
import type { TreeNode, DialogueLine, UserSource } from '@/types/tree';
import { NodeComments } from './NodeComments';
import { ComparisonMode } from './ComparisonMode';
import { AskAIPanel } from './AskAIPanel';
import { FreeformInput } from './FreeformInput';
import { useWizard } from '@/context/WizardContext';
import { useMode } from '@/hooks/useMode';
import { useNodeComments } from '@/hooks/useNodeComments';
import { getNotesForProblem } from './NotesPanel';
import { generateTranscript } from '../transcript/generateTranscript';
import { DialogueView } from './DialogueView';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CitationsList } from './CitationsList';

interface QuestionCardProps {
  node: TreeNode;
  problemId: string;
  onSelectChoice: (index: number) => void;
  onAdvance: () => void;
  onReset: () => void;
  liveDialogue?: DialogueLine[];
  isTyping?: boolean;
  onFreeformSubmit?: (text: string) => void;
  freeformLoading?: boolean;
  pendingNovelChoice?: { label: string; answer: string } | null;
  branchGenerating?: boolean;
  branchError?: string | null;
  onDismissError?: () => void;
  sources?: UserSource[];
  handsFreeActive?: boolean;
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

export function QuestionCard({ node, problemId, onSelectChoice, onAdvance, onReset, liveDialogue, isTyping, onFreeformSubmit, freeformLoading, pendingNovelChoice, branchGenerating, branchError, onDismissError, sources, handsFreeActive }: QuestionCardProps) {
  const stageColor = STAGE_COLORS[node.stage] || 'gray';
  const isInterviewer = node.speaker === 'interviewer';
  const [showComparison, setShowComparison] = useState(false);
  const { problem, path, nodeMap } = useWizard();
  const { config } = useMode();
  const { addComment } = useNodeComments(problemId, node.id);

  const getBorderColor = () => {
    const colorMap: Record<string, string> = {
      blue: '59, 130, 246',
      purple: '168, 85, 247',
      green: '34, 197, 94',
      amber: '251, 191, 36',
      red: '239, 68, 68',
      orange: '249, 115, 22',
      cyan: '6, 182, 212',
      pink: '236, 72, 153',
    };
    return `rgb(${colorMap[stageColor] || '156, 163, 175'})`;
  };

  const downloadTranscript = () => {
    if (!problem) return;

    const notes = getNotesForProblem(problemId);
    const transcript = generateTranscript(problem, path, nodeMap, notes);

    const blob = new Blob([transcript], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${problem.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_transcript.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSaveAIAsComment = async (question: string, answer: string) => {
    const authorName = localStorage.getItem('comment_author') || 'Anonymous';

    // Add question as a comment
    await addComment(question, authorName, 'question');

    // Add AI answer as a reply (we'll need to get the comment ID, so let's add them separately)
    // For now, we'll add the answer as a standalone comment with type 'answer'
    await addComment(
      `AI Answer: ${answer}`,
      'AI Assistant',
      'answer'
    );
  };

  return (
    <div
      className="bg-white rounded-lg shadow-lg border-l-4 overflow-hidden"
      style={{ borderLeftColor: getBorderColor() }}
    >
      <div className="p-3 sm:p-4 md:p-6">
        {/* Speaker Label — hidden when showing dialogue (bubbles have their own labels) */}
        {!(config.useDialogue && node.dialogue && node.dialogue.length > 0) && (
          <div className="mb-4">
            <span
              className={`
                inline-flex items-center px-3 py-1 rounded-full text-sm font-medium
                ${
                  isInterviewer
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-green-100 text-green-800'
                }
              `}
            >
              {isInterviewer ? (
                <svg
                  className="w-4 h-4 mr-1.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <svg
                  className="w-4 h-4 mr-1.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                </svg>
              )}
              {isInterviewer ? 'Interviewer' : 'Candidate'}
            </span>
          </div>
        )}

        {/* Content — dialogue view or flat content */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">{node.label}</h3>
          {(() => {
            const baseDialogue = config.useDialogue && node.dialogue ? node.dialogue : [];
            const combined = liveDialogue ? [...baseDialogue, ...liveDialogue] : baseDialogue;
            if (combined.length > 0) {
              return <DialogueView lines={combined} isTyping={isTyping} />;
            }
            return (
              <div className="text-gray-700 leading-relaxed prose prose-sm max-w-none overflow-x-auto break-words">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{node.content}</ReactMarkdown>
              </div>
            );
          })()}
          <CitationsList citations={node.citations} />
        </div>

        {/* Actions based on node type */}
        {node.type === 'info' && node.next && (
          <div className="flex justify-end">
            <button
              onClick={onAdvance}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200 flex items-center gap-2"
            >
              Continue
              <svg
                className="w-5 h-5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
          </div>
        )}

        {node.type === 'question' && node.choices && (
          <div className="space-y-3">
            {node.choices.map((choice, index) => (
              <button
                key={index}
                data-testid="choice-button"
                onClick={() => onSelectChoice(index)}
                className={`w-full text-left bg-gray-50 hover:bg-gray-100 border border-gray-200 hover:border-gray-300 rounded-lg transition-all duration-200 group ${
                  config.drivingFriendly ? 'p-6 min-h-16' : 'p-3 sm:p-4 min-h-[44px]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-white border-2 border-gray-300 group-hover:border-blue-500 flex items-center justify-center mt-0.5">
                    <div className="w-2 h-2 rounded-full bg-transparent group-hover:bg-blue-500 transition-colors duration-200" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`font-medium text-gray-900 mb-1 ${config.drivingFriendly ? 'text-lg' : ''}`}>{choice.label}</div>
                    {config.showHints && choice.answer && (
                      <div className="text-sm text-gray-600 prose prose-sm max-w-none overflow-x-auto break-words">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{choice.answer}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}

            {/* Pending Novel Choice — shown as selected while branch generates */}
            {pendingNovelChoice && (
              <div className={`w-full text-left border-2 rounded-lg transition-all duration-200 ${
                branchError
                  ? 'bg-red-50 border-red-300'
                  : 'bg-indigo-50 border-indigo-400'
              } ${config.drivingFriendly ? 'p-6 min-h-16' : 'p-4'}`}>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full border-2 border-indigo-500 bg-indigo-500 flex items-center justify-center mt-0.5">
                    {branchGenerating ? (
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : branchError ? (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className={`font-medium mb-1 ${config.drivingFriendly ? 'text-lg' : ''} ${branchError ? 'text-red-900' : 'text-indigo-900'}`}>
                        {pendingNovelChoice.label}
                      </div>
                      {branchGenerating && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-200 text-indigo-800">
                          Generating...
                        </span>
                      )}
                    </div>
                    <div className={`text-sm ${branchError ? 'text-red-700' : 'text-indigo-700'}`}>
                      {pendingNovelChoice.answer}
                    </div>
                    {branchError && (
                      <div className="mt-2 flex items-center gap-2">
                        <p className="text-xs text-red-600">{branchError}</p>
                        {onDismissError && (
                          <button
                            onClick={() => { onDismissError(); }}
                            className="text-xs text-red-500 underline hover:text-red-700"
                          >
                            Dismiss
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {node.type === 'terminal' && (
          <div className="space-y-3">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-800">
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="font-medium">Interview Complete</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={onReset}
                className="flex-1 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Start Over
              </button>
              <button
                onClick={downloadTranscript}
                className="flex-1 px-6 py-2.5 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download Transcript
              </button>
            </div>
          </div>
        )}

        {/* Freeform Input */}
        {onFreeformSubmit && node.type !== 'terminal' && (
          <FreeformInput
            onSubmit={onFreeformSubmit}
            loading={freeformLoading || false}
            placeholder={
              node.type === 'question'
                ? 'Type your own answer or ask a clarifying question...'
                : 'Ask a question before continuing...'
            }
            handsFreeActive={handsFreeActive}
          />
        )}

        {/* Ask AI Panel */}
        {config.showAskAI && (
          <AskAIPanel
            nodeId={node.id}
            nodeContent={node.content}
            nodeStage={node.stage}
            problemId={problemId}
            problemTitle={problem?.title || 'ML System Design Interview'}
            onSaveAsComment={handleSaveAIAsComment}
            sources={sources}
          />
        )}

        {/* Comments / Suggestions */}
        {config.showComments && (
          <NodeComments problemId={problemId} nodeId={node.id} />
        )}
      </div>

      {/* Comparison Mode Modal */}
      {showComparison && (
        <ComparisonMode
          isOpen={showComparison}
          onClose={() => setShowComparison(false)}
          path={path}
          nodeMap={nodeMap}
        />
      )}
    </div>
  );
}
