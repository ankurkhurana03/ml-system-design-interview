import { useState, useRef, useEffect } from 'react';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';

interface FreeformInputProps {
  onSubmit: (text: string) => void;
  loading: boolean;
  disabled?: boolean;
  placeholder?: string;
  handsFreeActive?: boolean;
}

export function FreeformInput({ onSubmit, loading, disabled, placeholder, handsFreeActive }: FreeformInputProps) {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const speechRecognition = useSpeechRecognition();

  // When speech recognition produces a final transcript, put it in the input
  useEffect(() => {
    if (speechRecognition.transcript) {
      setText((prev) => (prev ? prev + ' ' : '') + speechRecognition.transcript);
    }
  }, [speechRecognition.transcript]);

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed || loading || disabled) return;
    onSubmit(trimmed);
    setText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      handleSubmit();
    }
  };

  const toggleMic = () => {
    if (speechRecognition.isListening) {
      speechRecognition.stopListening();
    } else {
      speechRecognition.startListening();
    }
  };

  return (
    <div className="flex items-center gap-2 mt-4 p-3 bg-gray-50 border border-gray-200 rounded-xl">
      <input
        ref={inputRef}
        type="text"
        value={speechRecognition.isListening ? text + (speechRecognition.interimTranscript ? ' ' + speechRecognition.interimTranscript : '') : text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || 'Type your answer or ask a question...'}
        disabled={loading || disabled}
        className="flex-1 text-sm border-0 bg-transparent focus:outline-none focus:ring-0 placeholder-gray-400 text-gray-800 disabled:opacity-50"
      />

      {/* Mic button — hidden when hands-free mode owns the mic */}
      {speechRecognition.isSupported && !handsFreeActive && (
        <button
          onClick={toggleMic}
          disabled={loading || disabled}
          className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
            speechRecognition.isListening
              ? 'bg-red-500 text-white animate-pulse'
              : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
          title={speechRecognition.isListening ? 'Stop recording' : 'Voice input'}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
            />
          </svg>
        </button>
      )}

      {/* Send button */}
      <button
        onClick={handleSubmit}
        disabled={!text.trim() || loading || disabled}
        className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title="Send"
      >
        {loading ? (
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
            />
          </svg>
        )}
      </button>
    </div>
  );
}
