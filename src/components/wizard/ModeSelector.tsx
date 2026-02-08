import type { InterviewMode } from '@/types/tree';

interface ModeSelectorProps {
  currentMode: InterviewMode;
  onSelectMode: (mode: InterviewMode) => void;
  isOpen: boolean;
  onClose: () => void;
}

const MODE_INFO: { mode: InterviewMode; label: string; description: string; icon: string }[] = [
  {
    mode: 'mock_interview',
    label: 'Mock Interview',
    description: 'Realistic interview simulation. No hints, enforced timer, voice-enabled. Graph hidden for focus.',
    icon: 'mic',
  },
  {
    mode: 'tutor',
    label: 'Tutor',
    description: 'Guided learning with explanations, hints, AI assistance, and voice-over. Pauses for understanding.',
    icon: 'book',
  },
  {
    mode: 'designer',
    label: 'Designer',
    description: 'Full access to all tools: graph view, notes, comments, comparison mode. Self-directed exploration.',
    icon: 'eye',
  },
];

export function ModeSelector({ currentMode, onSelectMode, isOpen, onClose }: ModeSelectorProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900">Choose Interview Mode</h2>
          <p className="text-sm text-gray-500 mt-1">Select how you want to practice</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {MODE_INFO.map(({ mode, label, description, icon }) => (
            <button
              key={mode}
              onClick={() => { onSelectMode(mode); onClose(); }}
              className={`
                p-5 rounded-xl border-2 text-left transition-all duration-200 group
                ${currentMode === mode
                  ? 'border-blue-500 bg-blue-50 shadow-md'
                  : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'}
              `}
            >
              <div className="mb-3">
                {icon === 'mic' && (
                  <svg className={`w-8 h-8 ${currentMode === mode ? 'text-blue-600' : 'text-gray-400 group-hover:text-blue-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                )}
                {icon === 'book' && (
                  <svg className={`w-8 h-8 ${currentMode === mode ? 'text-blue-600' : 'text-gray-400 group-hover:text-blue-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                )}
                {icon === 'eye' && (
                  <svg className={`w-8 h-8 ${currentMode === mode ? 'text-blue-600' : 'text-gray-400 group-hover:text-blue-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </div>
              <h3 className={`font-semibold mb-1 ${currentMode === mode ? 'text-blue-900' : 'text-gray-900'}`}>
                {label}
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
              {currentMode === mode && (
                <div className="mt-3 text-xs font-medium text-blue-600">Current mode</div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
