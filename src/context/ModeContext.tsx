import { createContext, useState, useEffect, useMemo, type ReactNode } from 'react';
import type { InterviewMode, ModeConfig } from '@/types/tree';

export const MODE_PRESETS: Record<InterviewMode, ModeConfig> = {
  mock_interview: {
    mode: 'mock_interview',
    timerEnforced: true,
    autoAdvanceInfo: false,
    showHints: false,
    showComparison: false,
    showNotes: false,
    showComments: false,
    showAskAI: false,
    showGraph: false,
    showKeyboardHints: false,
    voiceAutoEnabled: true,
    drivingFriendly: true,
    showExplanations: false,
    pauseForUnderstanding: false,
    useDialogue: true,
  },
  tutor: {
    mode: 'tutor',
    timerEnforced: false,
    autoAdvanceInfo: false,
    showHints: true,
    showComparison: true,
    showNotes: true,
    showComments: true,
    showAskAI: true,
    showGraph: true,
    showKeyboardHints: true,
    voiceAutoEnabled: true,
    drivingFriendly: false,
    showExplanations: true,
    pauseForUnderstanding: true,
    useDialogue: true,
  },
  designer: {
    mode: 'designer',
    timerEnforced: false,
    autoAdvanceInfo: false,
    showHints: true,
    showComparison: true,
    showNotes: true,
    showComments: true,
    showAskAI: true,
    showGraph: true,
    showKeyboardHints: true,
    voiceAutoEnabled: false,
    drivingFriendly: false,
    showExplanations: true,
    pauseForUnderstanding: false,
    useDialogue: false,
  },
};

interface ModeContextValue {
  mode: InterviewMode;
  config: ModeConfig;
  setMode: (mode: InterviewMode) => void;
}

const ModeContext = createContext<ModeContextValue | null>(null);

export function ModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<InterviewMode>(() => {
    const stored = localStorage.getItem('interviewMode');
    if (stored && (stored === 'mock_interview' || stored === 'tutor' || stored === 'designer')) {
      return stored as InterviewMode;
    }
    return 'tutor';
  });

  useEffect(() => {
    localStorage.setItem('interviewMode', mode);
  }, [mode]);

  const config = useMemo(() => MODE_PRESETS[mode], [mode]);

  const setMode = (newMode: InterviewMode) => {
    setModeState(newMode);
  };

  return (
    <ModeContext.Provider value={{ mode, config, setMode }}>
      {children}
    </ModeContext.Provider>
  );
}

export { ModeContext };
