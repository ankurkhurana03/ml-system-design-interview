import { createContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import type { Speaker, TTSProvider } from '@/types/tree';
import {
  createBrowserTTS,
  createKokoroTTS,
  loadKokoroModel,
  isKokoroLoaded,
  KOKORO_VOICES,
  DEFAULT_INTERVIEWER_VOICE,
  DEFAULT_CANDIDATE_VOICE,
  type TTSPlaybackHandle,
} from '@/lib/ttsEngine';

interface VoiceOverPreferences {
  enabled: boolean;
  rate: number;
  autoAdvance: boolean;
  ttsProvider: TTSProvider;
  interviewerVoice: string;
  candidateVoice: string;
  kokoroInterviewerVoice: string;
  kokoroCandiateVoice: string;
}

export interface VoiceOverContextValue {
  speak: (text: string, speaker: Speaker, onEnd?: () => void) => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  isPlaying: boolean;
  isPaused: boolean;
  rate: number;
  setRate: (rate: number) => void;
  autoAdvance: boolean;
  setAutoAdvance: (value: boolean) => void;
  enabled: boolean;
  setEnabled: (value: boolean) => void;
  isSupported: boolean;
  voices: SpeechSynthesisVoice[];
  interviewerVoice: string;
  candidateVoice: string;
  setInterviewerVoice: (voice: string) => void;
  setCandidateVoice: (voice: string) => void;
  currentSpeaker: Speaker | null;
  // Kokoro TTS
  ttsProvider: TTSProvider;
  setTTSProvider: (provider: TTSProvider) => void;
  modelLoading: boolean;
  modelProgress: number;
  modelStatus: string;
  modelReady: boolean;
  loadModel: () => Promise<void>;
  kokoroVoices: typeof KOKORO_VOICES;
  kokoroInterviewerVoice: string;
  kokoroCandidateVoice: string;
  setKokoroInterviewerVoice: (voice: string) => void;
  setKokoroCandidateVoice: (voice: string) => void;
}

const STORAGE_KEY = 'voiceover_preferences';

const DEFAULT_PREFERENCES: VoiceOverPreferences = {
  enabled: false,
  rate: 1.0,
  autoAdvance: false,
  ttsProvider: 'kokoro',
  interviewerVoice: '',
  candidateVoice: '',
  kokoroInterviewerVoice: DEFAULT_INTERVIEWER_VOICE,
  kokoroCandiateVoice: DEFAULT_CANDIDATE_VOICE,
};

function loadPreferences(): VoiceOverPreferences {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
    }
  } catch (error) {
    console.error('Failed to load voice-over preferences:', error);
  }
  return DEFAULT_PREFERENCES;
}

function savePreferences(preferences: Partial<VoiceOverPreferences>): void {
  try {
    const current = loadPreferences();
    const updated = { ...current, ...preferences };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to save voice-over preferences:', error);
  }
}

const VoiceOverContext = createContext<VoiceOverContextValue | null>(null);

export function VoiceOverProvider({ children }: { children: ReactNode }) {
  const [isSupported] = useState(() => 'speechSynthesis' in window);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentSpeaker, setCurrentSpeaker] = useState<Speaker | null>(null);

  const preferences = loadPreferences();
  const [enabled, setEnabledState] = useState(preferences.enabled);
  const [rate, setRateState] = useState(preferences.rate);
  const [autoAdvance, setAutoAdvanceState] = useState(preferences.autoAdvance);
  const [interviewerVoice, setInterviewerVoiceState] = useState(preferences.interviewerVoice);
  const [candidateVoice, setCandidateVoiceState] = useState(preferences.candidateVoice);

  // Kokoro state
  const [ttsProvider, setTTSProviderState] = useState<TTSProvider>(preferences.ttsProvider);
  const [kokoroInterviewerVoice, setKokoroInterviewerVoiceState] = useState(preferences.kokoroInterviewerVoice);
  const [kokoroCandidateVoice, setKokoroCandidateVoiceState] = useState(preferences.kokoroCandiateVoice);
  const [modelLoading, setModelLoading] = useState(false);
  const [modelProgress, setModelProgress] = useState(0);
  const [modelStatus, setModelStatus] = useState('');
  const [modelReady, setModelReady] = useState(() => isKokoroLoaded());

  const playbackRef = useRef<TTSPlaybackHandle | null>(null);
  const onEndCallbackRef = useRef<(() => void) | null>(null);
  const speakGenRef = useRef(0); // generation counter to prevent async TTS overlap

  // Load browser voices
  useEffect(() => {
    if (!isSupported) return;

    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);

      if (!interviewerVoice && availableVoices.length > 0) {
        const maleVoice = availableVoices.find(
          (v) => v.name.toLowerCase().includes('male') ||
                 v.name.toLowerCase().includes('david') ||
                 v.name.toLowerCase().includes('daniel')
        );
        const defaultInterviewer = maleVoice || availableVoices[0];
        setInterviewerVoiceState(defaultInterviewer.name);
        savePreferences({ interviewerVoice: defaultInterviewer.name });
      }

      if (!candidateVoice && availableVoices.length > 1) {
        const femaleVoice = availableVoices.find(
          (v) => v.name.toLowerCase().includes('female') ||
                 v.name.toLowerCase().includes('samantha') ||
                 v.name.toLowerCase().includes('karen')
        );
        const defaultCandidate = femaleVoice || availableVoices[1] || availableVoices[0];
        setCandidateVoiceState(defaultCandidate.name);
        savePreferences({ candidateVoice: defaultCandidate.name });
      }
    };

    loadVoices();

    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, [isSupported, interviewerVoice, candidateVoice]);

  const stop = useCallback(() => {
    // Invalidate any in-flight async TTS creation
    speakGenRef.current++;
    if (playbackRef.current) {
      playbackRef.current.stop();
      playbackRef.current = null;
    } else if (isSupported) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentSpeaker(null);
    onEndCallbackRef.current = null;
  }, [isSupported]);

  const pause = useCallback(() => {
    if (!isPlaying) return;
    if (playbackRef.current) {
      playbackRef.current.pause();
    } else if (isSupported) {
      window.speechSynthesis.pause();
    }
    setIsPaused(true);
  }, [isPlaying, isSupported]);

  const resume = useCallback(() => {
    if (!isPaused) return;
    if (playbackRef.current) {
      playbackRef.current.resume();
    } else if (isSupported) {
      window.speechSynthesis.resume();
    }
    setIsPaused(false);
  }, [isPaused, isSupported]);

  const loadModel = useCallback(async () => {
    if (modelReady || modelLoading) return;
    setModelLoading(true);
    setModelProgress(0);
    setModelStatus('Starting...');
    try {
      await loadKokoroModel((progress, status) => {
        setModelProgress(progress);
        setModelStatus(status);
      });
      setModelReady(true);
    } catch (err) {
      console.error('Failed to load Kokoro model:', err);
      setModelStatus('Failed to load model');
    } finally {
      setModelLoading(false);
    }
  }, [modelReady, modelLoading]);

  const speak = useCallback(
    (text: string, speaker: Speaker, onEnd?: () => void) => {
      if (!enabled || !text) return;

      stop();

      // Increment generation counter so any in-flight async TTS is discarded
      const gen = ++speakGenRef.current;

      if (onEnd) {
        onEndCallbackRef.current = onEnd;
      }

      const callbacks = {
        onStart: () => {
          if (speakGenRef.current !== gen) return; // stale
          setIsPlaying(true);
          setIsPaused(false);
          setCurrentSpeaker(speaker);
        },
        onEnd: () => {
          if (speakGenRef.current !== gen) return; // stale
          setIsPlaying(false);
          setIsPaused(false);
          setCurrentSpeaker(null);
          playbackRef.current = null;
          if (onEndCallbackRef.current) {
            onEndCallbackRef.current();
            onEndCallbackRef.current = null;
          }
        },
        onError: (err: unknown) => {
          if (speakGenRef.current !== gen) return; // stale
          console.error('TTS error:', err);
          setIsPlaying(false);
          setIsPaused(false);
          setCurrentSpeaker(null);
          playbackRef.current = null;
          onEndCallbackRef.current = null;
        },
      };

      if (ttsProvider === 'kokoro') {
        const voiceId = speaker === 'interviewer' ? kokoroInterviewerVoice : kokoroCandidateVoice;
        createKokoroTTS(text, voiceId, rate, callbacks, (progress, status) => {
          setModelProgress(progress);
          setModelStatus(status);
          if (progress >= 100) setModelReady(true);
        }).then((handle) => {
          if (speakGenRef.current !== gen) {
            // A newer speak() was called while this was being created — discard
            handle.stop();
            return;
          }
          playbackRef.current = handle;
        }).catch((err) => {
          if (speakGenRef.current !== gen) return; // stale
          callbacks.onError(err);
        });
      } else {
        if (!isSupported) return;
        const voiceName = speaker === 'interviewer' ? interviewerVoice : candidateVoice;
        playbackRef.current = createBrowserTTS(text, voiceName, rate, voices, callbacks);
      }
    },
    [enabled, ttsProvider, isSupported, voices, rate, interviewerVoice, candidateVoice, kokoroInterviewerVoice, kokoroCandidateVoice, stop]
  );

  const setEnabled = useCallback((value: boolean) => {
    setEnabledState(value);
    savePreferences({ enabled: value });
    if (!value) {
      stop();
    }
  }, [stop]);

  const setRate = useCallback((value: number) => {
    const clampedRate = Math.max(0.5, Math.min(2.0, value));
    setRateState(clampedRate);
    savePreferences({ rate: clampedRate });
  }, []);

  const setAutoAdvance = useCallback((value: boolean) => {
    setAutoAdvanceState(value);
    savePreferences({ autoAdvance: value });
  }, []);

  const setInterviewerVoice = useCallback((voice: string) => {
    setInterviewerVoiceState(voice);
    savePreferences({ interviewerVoice: voice });
  }, []);

  const setCandidateVoice = useCallback((voice: string) => {
    setCandidateVoiceState(voice);
    savePreferences({ candidateVoice: voice });
  }, []);

  const setTTSProvider = useCallback((provider: TTSProvider) => {
    setTTSProviderState(provider);
    savePreferences({ ttsProvider: provider });
    stop();
  }, [stop]);

  const setKokoroInterviewerVoice = useCallback((voice: string) => {
    setKokoroInterviewerVoiceState(voice);
    savePreferences({ kokoroInterviewerVoice: voice });
  }, []);

  const setKokoroCandidateVoice = useCallback((voice: string) => {
    setKokoroCandidateVoiceState(voice);
    savePreferences({ kokoroCandiateVoice: voice });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (playbackRef.current) {
        playbackRef.current.stop();
      }
      if (isSupported) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isSupported]);

  return (
    <VoiceOverContext.Provider value={{
      speak, stop, pause, resume,
      isPlaying, isPaused, rate, setRate,
      autoAdvance, setAutoAdvance,
      enabled, setEnabled,
      isSupported: ttsProvider === 'kokoro' ? true : isSupported,
      voices, interviewerVoice, candidateVoice,
      setInterviewerVoice, setCandidateVoice,
      currentSpeaker,
      ttsProvider, setTTSProvider,
      modelLoading, modelProgress, modelStatus, modelReady, loadModel,
      kokoroVoices: KOKORO_VOICES,
      kokoroInterviewerVoice, kokoroCandidateVoice,
      setKokoroInterviewerVoice, setKokoroCandidateVoice,
    }}>
      {children}
    </VoiceOverContext.Provider>
  );
}

export { VoiceOverContext };
