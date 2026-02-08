import { useState, useEffect } from 'react';
import { useAIAnswer, type AIAnswerResponse } from '@/hooks/useAIAnswer';

interface AskAIPanelProps {
  nodeId: string;
  nodeContent: string;
  nodeStage: string;
  problemId: string;
  problemTitle: string;
  onSaveAsComment?: (question: string, answer: string) => void;
}

export function AskAIPanel({
  nodeId,
  nodeContent,
  nodeStage,
  problemId,
  problemTitle,
  onSaveAsComment,
}: AskAIPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [question, setQuestion] = useState('');
  const [history, setHistory] = useState<AIAnswerResponse[]>([]);
  const { answer, loading, error, askQuestion } = useAIAnswer();

  // Load history from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(`ai_history_${problemId}_${nodeId}`);
    if (stored) {
      try {
        setHistory(JSON.parse(stored));
      } catch {
        setHistory([]);
      }
    }
  }, [problemId, nodeId]);

  // Save to history when answer is received
  useEffect(() => {
    if (answer && question) {
      const newEntry: AIAnswerResponse = {
        question,
        answer,
        timestamp: new Date().toISOString(),
      };
      const newHistory = [newEntry, ...history];
      setHistory(newHistory);
      localStorage.setItem(`ai_history_${problemId}_${nodeId}`, JSON.stringify(newHistory));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || loading) return;

    await askQuestion(question.trim(), nodeContent, nodeStage, problemTitle);
  };

  const handleSaveAsComment = () => {
    if (answer && question && onSaveAsComment) {
      onSaveAsComment(question, answer);
      // Optionally clear the current question/answer after saving
      setQuestion('');
    }
  };

  const timeAgo = (dateStr: string): string => {
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="mt-4 border-t border-gray-200 pt-3">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-sm font-medium text-purple-600 hover:text-purple-700 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        </svg>
        <span>Ask AI Assistant</span>
        <svg
          className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="mt-3 space-y-4 animate-slide-up">
          {/* Question input form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ask a question about this stage..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                disabled={loading}
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              <button
                type="submit"
                disabled={!question.trim() || loading}
                className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Asking...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 7l5 5m0 0l-5 5m5-5H6"
                      />
                    </svg>
                    Ask
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Error message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2 text-red-800">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <div className="text-sm">{error}</div>
              </div>
            </div>
          )}

          {/* Current answer */}
          {answer && (
            <div className="p-4 bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                    </svg>
                    AI Assistant
                  </div>
                </div>
                {onSaveAsComment && (
                  <button
                    onClick={handleSaveAsComment}
                    className="text-xs text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                      />
                    </svg>
                    Save as Comment
                  </button>
                )}
              </div>
              <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {answer}
              </div>
            </div>
          )}

          {/* History */}
          {history.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Previous Questions
                </h4>
                <button
                  onClick={() => {
                    setHistory([]);
                    localStorage.removeItem(`ai_history_${problemId}_${nodeId}`);
                  }}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  Clear history
                </button>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {history.map((entry, index) => (
                  <div
                    key={index}
                    className="p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-gray-700">{entry.question}</p>
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        {timeAgo(entry.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">
                      {entry.answer.length > 200
                        ? `${entry.answer.substring(0, 200)}...`
                        : entry.answer}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
