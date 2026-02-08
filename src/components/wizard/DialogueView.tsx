import { useEffect, useRef } from 'react';
import type { DialogueLine } from '@/types/tree';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface DialogueViewProps {
  lines: DialogueLine[];
  isTyping?: boolean;
}

export function DialogueView({ lines, isTyping }: DialogueViewProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll within the nearest scrollable ancestor only — avoid scrolling the root container
    const el = bottomRef.current;
    if (!el) return;
    const scrollParent = el.closest('.overflow-y-auto') as HTMLElement | null;
    if (scrollParent) {
      scrollParent.scrollTo({ top: scrollParent.scrollHeight, behavior: 'smooth' });
    }
  }, [lines.length, isTyping]);

  return (
    <div className="space-y-3">
      {lines.map((line, index) => {
        const isInterviewer = line.speaker === 'interviewer';
        return (
          <div
            key={index}
            className={`flex ${isInterviewer ? 'justify-start' : 'justify-end'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                isInterviewer
                  ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-tl-sm'
                  : 'bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-tr-sm'
              }`}
            >
              <div
                className={`text-xs font-semibold mb-1 ${
                  isInterviewer ? 'text-blue-700 dark:text-blue-300' : 'text-green-700 dark:text-green-300'
                }`}
              >
                {isInterviewer ? 'Interviewer' : 'Candidate'}
              </div>
              <div className="text-gray-800 dark:text-gray-200 text-sm prose prose-sm max-w-none break-words">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {line.text}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        );
      })}

      {isTyping && (
        <div className="flex justify-start">
          <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-tl-sm">
            <div className="text-xs font-semibold mb-1 text-blue-700 dark:text-blue-300">Interviewer</div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-blue-400 dark:bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-blue-400 dark:bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-blue-400 dark:bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
