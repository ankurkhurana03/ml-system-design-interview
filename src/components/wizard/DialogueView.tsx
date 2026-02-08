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
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
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
                  ? 'bg-blue-50 border border-blue-200 rounded-tl-sm'
                  : 'bg-green-50 border border-green-200 rounded-tr-sm'
              }`}
            >
              <div
                className={`text-xs font-semibold mb-1 ${
                  isInterviewer ? 'text-blue-700' : 'text-green-700'
                }`}
              >
                {isInterviewer ? 'Interviewer' : 'Candidate'}
              </div>
              <div className="text-gray-800 text-sm prose prose-sm max-w-none break-words">
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
          <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-blue-50 border border-blue-200 rounded-tl-sm">
            <div className="text-xs font-semibold mb-1 text-blue-700">Interviewer</div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
