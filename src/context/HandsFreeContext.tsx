import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from 'react';
import { parseVoiceCommand, parseInterruptCommand, type VoiceCommand } from '@/utils/voiceCommands';
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
  const interruptFiredRef = useRef(false); // debounce: only fire one interrupt per TTS session

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

      // During TTS playback, check interim results for interrupt commands
      // (isFinal won't fire until the TTS sentence ends, but interim is fast)
      if (ttsPausedRef.current && interim && !interruptFiredRef.current) {
        const interrupt = parseInterruptCommand(interim);
        if (interrupt) {
          interruptFiredRef.current = true; // only fire once per TTS session
          setLastCommand(interrupt);
          if (lastCommandTimerRef.current) clearTimeout(lastCommandTimerRef.current);
          lastCommandTimerRef.current = setTimeout(() => setLastCommand(null), 2000);
          callbackRef?.onCommand(interrupt);
          return; // don't process further
        }
      }

      if (!ttsPausedRef.current) {
        setInterimTranscript(interim);
      }

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

          // Commands are always dispatched — even during TTS playback
          // (allows "pause", "stop", "repeat" to work mid-speech)
          callbackRef?.onCommand(command);
        } else if (!ttsPausedRef.current) {
          // Freeform text is only processed when TTS is NOT playing
          // (avoids echo from speakers being treated as user speech)
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
        // else: freeform during TTS → discard (echo suppression)
      }
    };

    recognition.onerror = (event: any) => {
      const errorType = event.error as string;
      if (errorType === 'no-speech' || errorType === 'aborted') {
        // Benign — no speech detected or aborted by TTS coordination
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
      // Auto-restart if still enabled (recognition always stays on, even during TTS)
      if (enabledRef.current) {
        restartTimerRef.current = setTimeout(() => {
          if (enabledRef.current && recognitionRef.current) {
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
  // Recognition stays running during TTS (so "pause"/"stop" commands work),
  // but freeform text is suppressed to avoid echo from speakers.
  const voiceOverIsPlaying = voiceOver.isPlaying;

  useEffect(() => {
    if (!enabled) return;
    ttsPausedRef.current = voiceOverIsPlaying;
    if (voiceOverIsPlaying) {
      // TTS started — reset interrupt debounce so user can interrupt this session
      interruptFiredRef.current = false;
    } else {
      // TTS ended — clear any echo artifacts from interim display
      setInterimTranscript('');
    }
  }, [voiceOverIsPlaying, enabled]);

  // Auto-enable voice-over + autoAdvance when hands-free is turned on
  // (deferred to useEffect to avoid updating VoiceOverProvider during HandsFreeProvider render)
  const pendingEnableRef = useRef(false);
  useEffect(() => {
    if (pendingEnableRef.current) {
      pendingEnableRef.current = false;
      if (!voiceOver.enabled) voiceOver.setEnabled(true);
      if (!voiceOver.autoAdvance) voiceOver.setAutoAdvance(true);
    }
  }, [enabled, voiceOver]);

  // --- Toggle ---
  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      saveEnabled(next);
      if (next) {
        pendingEnableRef.current = true;
        setError(null);
      }
      return next;
    });
  }, []);

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
