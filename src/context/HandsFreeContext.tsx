import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from 'react';
import { parseVoiceCommand, type VoiceCommand } from '@/utils/voiceCommands';
import { useVoiceOver } from '@/hooks/useVoiceOver';

// --- Types ---

export interface HandsFreeContextValue {
  enabled: boolean;
  toggle: () => void;
  isListening: boolean;
  isSupported: boolean;
  lastCommand: VoiceCommand | null;
  interimTranscript: string;
  error: string | null;
}

interface HandsFreeCallbacks {
  onCommand: (cmd: VoiceCommand) => void;
  onFreeformText: (text: string) => void;
}

// --- Context ---

const HandsFreeContext = createContext<HandsFreeContextValue | null>(null);

// Callback registration — refs stored here so the provider can call them
// without re-render cascades. Only one consumer should register at a time.
let callbackRef: HandsFreeCallbacks | null = null;

export function useHandsFree(): HandsFreeContextValue {
  const ctx = useContext(HandsFreeContext);
  if (!ctx) throw new Error('useHandsFree must be used within HandsFreeProvider');
  return ctx;
}

/**
 * Register command/freeform callbacks from the consuming component (WizardPanel).
 * Uses a module-level ref so callbacks are available synchronously to the provider
 * without causing re-render loops.
 */
export function useHandsFreeCallbacks(callbacks: HandsFreeCallbacks): void {
  const ref = useRef(callbacks);
  ref.current = callbacks;

  useEffect(() => {
    callbackRef = ref.current;
    // Keep the ref fresh on every render
    const interval = setInterval(() => {
      callbackRef = ref.current;
    }, 100);
    return () => {
      clearInterval(interval);
      callbackRef = null;
    };
  }, []);
}

// --- Storage ---

const STORAGE_KEY = 'handsfree_enabled';

function loadEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function saveEnabled(value: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(value));
  } catch {
    // ignore
  }
}

// --- Provider ---

const isRecognitionSupported =
  typeof window !== 'undefined' &&
  ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

export function HandsFreeProvider({ children }: { children: ReactNode }) {
  const voiceOver = useVoiceOver();

  const [enabled, setEnabled] = useState(() => isRecognitionSupported && loadEnabled());
  const [isListening, setIsListening] = useState(false);
  const [lastCommand, setLastCommand] = useState<VoiceCommand | null>(null);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const enabledRef = useRef(enabled);
  const ttsPausedRef = useRef(false);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const freeformBufferRef = useRef('');
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCommandTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep enabledRef in sync
  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  // --- Create SpeechRecognition instance ---
  useEffect(() => {
    if (!isRecognitionSupported) return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let finalText = '';
      let interim = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      setInterimTranscript(interim);

      if (finalText) {
        const trimmed = finalText.trim();
        if (!trimmed) return;

        const command = parseVoiceCommand(trimmed);
        if (command) {
          // Clear any pending freeform buffer — this was a command
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
          freeformBufferRef.current = '';

          setLastCommand(command);
          // Clear command badge after 2s
          if (lastCommandTimerRef.current) clearTimeout(lastCommandTimerRef.current);
          lastCommandTimerRef.current = setTimeout(() => setLastCommand(null), 2000);

          callbackRef?.onCommand(command);
        } else {
          // Accumulate freeform text with silence debounce
          freeformBufferRef.current = freeformBufferRef.current
            ? freeformBufferRef.current + ' ' + trimmed
            : trimmed;

          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = setTimeout(() => {
            const text = freeformBufferRef.current.trim();
            freeformBufferRef.current = '';
            if (text) {
              callbackRef?.onFreeformText(text);
            }
          }, 1500);
        }
      }
    };

    recognition.onerror = (event: any) => {
      const errorType = event.error as string;
      if (errorType === 'no-speech') {
        // Benign — just no speech detected, will auto-restart
        return;
      }
      if (errorType === 'audio-capture' || errorType === 'not-allowed') {
        setError(
          errorType === 'not-allowed'
            ? 'Microphone access denied. Please allow mic access in your browser settings.'
            : 'No microphone found. Please check your audio input device.',
        );
        setEnabled(false);
        saveEnabled(false);
        setIsListening(false);
        return;
      }
      // Other errors — log but don't disable
      console.warn('HandsFree speech error:', errorType);
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimTranscript('');
      // Auto-restart if still enabled and not paused by TTS
      if (enabledRef.current && !ttsPausedRef.current) {
        restartTimerRef.current = setTimeout(() => {
          if (enabledRef.current && !ttsPausedRef.current && recognitionRef.current) {
            try {
              recognitionRef.current.start();
              setIsListening(true);
            } catch {
              // Already running
            }
          }
        }, 300);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (lastCommandTimerRef.current) clearTimeout(lastCommandTimerRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Start/stop recognition when enabled changes ---
  useEffect(() => {
    if (!recognitionRef.current) return;

    if (enabled) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        setError(null);
      } catch {
        // Already started
      }
    } else {
      recognitionRef.current.abort();
      setIsListening(false);
      setInterimTranscript('');
      freeformBufferRef.current = '';
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
    }
  }, [enabled]);

  // --- TTS/STT coordination ---
  // When voice-over starts playing, pause recognition; resume after it ends
  const voiceOverIsPlaying = voiceOver.isPlaying;

  useEffect(() => {
    if (!enabled || !recognitionRef.current) return;

    if (voiceOverIsPlaying) {
      // TTS started — pause recognition to avoid echo
      ttsPausedRef.current = true;
      try {
        recognitionRef.current.abort();
      } catch {
        // not running
      }
      setIsListening(false);
      setInterimTranscript('');
    } else if (ttsPausedRef.current) {
      // TTS ended — resume after a short delay
      ttsPausedRef.current = false;
      const timer = setTimeout(() => {
        if (enabledRef.current && recognitionRef.current && !voiceOver.isPlaying) {
          try {
            recognitionRef.current.start();
            setIsListening(true);
          } catch {
            // Already running
          }
        }
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [voiceOverIsPlaying, enabled, voiceOver.isPlaying]);

  // --- Toggle ---
  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      saveEnabled(next);
      if (next) {
        // Auto-enable voice-over + autoAdvance
        if (!voiceOver.enabled) voiceOver.setEnabled(true);
        if (!voiceOver.autoAdvance) voiceOver.setAutoAdvance(true);
        setError(null);
      }
      return next;
    });
  }, [voiceOver]);

  const value: HandsFreeContextValue = {
    enabled,
    toggle,
    isListening,
    isSupported: isRecognitionSupported,
    lastCommand,
    interimTranscript,
    error,
  };

  return (
    <HandsFreeContext.Provider value={value}>{children}</HandsFreeContext.Provider>
  );
}
