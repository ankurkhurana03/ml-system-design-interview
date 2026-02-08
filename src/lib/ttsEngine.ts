import type { TTSProvider } from '@/types/tree';

// Kokoro voice metadata for the UI
export interface KokoroVoiceInfo {
  id: string;
  name: string;
  language: string;
  gender: string;
  traits?: string;
}

export const KOKORO_VOICES: KokoroVoiceInfo[] = [
  // American Female
  { id: 'af_heart', name: 'Heart', language: 'American', gender: 'Female', traits: 'warm' },
  { id: 'af_alloy', name: 'Alloy', language: 'American', gender: 'Female' },
  { id: 'af_aoede', name: 'Aoede', language: 'American', gender: 'Female' },
  { id: 'af_bella', name: 'Bella', language: 'American', gender: 'Female', traits: 'soft' },
  { id: 'af_jessica', name: 'Jessica', language: 'American', gender: 'Female' },
  { id: 'af_kore', name: 'Kore', language: 'American', gender: 'Female' },
  { id: 'af_nicole', name: 'Nicole', language: 'American', gender: 'Female', traits: 'whisper' },
  { id: 'af_nova', name: 'Nova', language: 'American', gender: 'Female' },
  { id: 'af_river', name: 'River', language: 'American', gender: 'Female' },
  { id: 'af_sarah', name: 'Sarah', language: 'American', gender: 'Female' },
  { id: 'af_sky', name: 'Sky', language: 'American', gender: 'Female' },
  // American Male
  { id: 'am_adam', name: 'Adam', language: 'American', gender: 'Male' },
  { id: 'am_echo', name: 'Echo', language: 'American', gender: 'Male' },
  { id: 'am_eric', name: 'Eric', language: 'American', gender: 'Male' },
  { id: 'am_fenrir', name: 'Fenrir', language: 'American', gender: 'Male' },
  { id: 'am_liam', name: 'Liam', language: 'American', gender: 'Male' },
  { id: 'am_michael', name: 'Michael', language: 'American', gender: 'Male' },
  { id: 'am_onyx', name: 'Onyx', language: 'American', gender: 'Male' },
  { id: 'am_puck', name: 'Puck', language: 'American', gender: 'Male' },
  { id: 'am_santa', name: 'Santa', language: 'American', gender: 'Male' },
  // British Female
  { id: 'bf_emma', name: 'Emma', language: 'British', gender: 'Female', traits: 'calm' },
  { id: 'bf_isabella', name: 'Isabella', language: 'British', gender: 'Female' },
  { id: 'bf_alice', name: 'Alice', language: 'British', gender: 'Female', traits: 'confident' },
  { id: 'bf_lily', name: 'Lily', language: 'British', gender: 'Female', traits: 'warm' },
  // British Male
  { id: 'bm_george', name: 'George', language: 'British', gender: 'Male' },
  { id: 'bm_lewis', name: 'Lewis', language: 'British', gender: 'Male' },
  { id: 'bm_daniel', name: 'Daniel', language: 'British', gender: 'Male', traits: 'deep' },
  { id: 'bm_fable', name: 'Fable', language: 'British', gender: 'Male', traits: 'storytelling' },
];

export const DEFAULT_INTERVIEWER_VOICE = 'am_michael';
export const DEFAULT_CANDIDATE_VOICE = 'af_heart';

type KokoroTTSInstance = {
  generate: (text: string, opts: { voice: string; speed: number }) => Promise<{ toBlob: () => Blob }>;
  stream: (text: string, opts?: { voice?: string; speed?: number }) => AsyncGenerator<{ text: string; audio: { toBlob: () => Blob } }>;
};

type ProgressInfo = {
  status: string;
  progress?: number;
  loaded?: number;
  total?: number;
};

let kokoroInstance: KokoroTTSInstance | null = null;
let loadingPromise: Promise<KokoroTTSInstance> | null = null;

async function detectWebGPU(): Promise<boolean> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nav = navigator as any;
    if (!nav.gpu) return false;
    const adapter = await nav.gpu.requestAdapter();
    return !!adapter;
  } catch {
    return false;
  }
}

export async function loadKokoroModel(
  onProgress?: (progress: number, status: string) => void,
): Promise<KokoroTTSInstance> {
  if (kokoroInstance) return kokoroInstance;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    try {
      onProgress?.(0, 'Detecting hardware...');
      const hasWebGPU = await detectWebGPU();
      const dtype = hasWebGPU ? 'fp32' : 'q8';
      const device = hasWebGPU ? 'webgpu' : 'wasm';

      onProgress?.(5, `Loading model (${device}, ${dtype})...`);

      const { KokoroTTS } = await import('kokoro-js');
      const tts = await KokoroTTS.from_pretrained(
        'onnx-community/Kokoro-82M-v1.0-ONNX',
        {
          dtype,
          device,
          progress_callback: (info: ProgressInfo) => {
            if (info.status === 'progress' && info.progress != null) {
              // Map 0-100 model progress to 5-95 of our overall progress
              const mapped = 5 + info.progress * 0.9;
              onProgress?.(mapped, 'Downloading model...');
            } else if (info.status === 'done') {
              onProgress?.(95, 'Finalizing...');
            }
          },
        },
      );

      onProgress?.(100, 'Ready');
      kokoroInstance = tts as unknown as KokoroTTSInstance;
      return kokoroInstance;
    } catch (err) {
      loadingPromise = null;
      throw err;
    }
  })();

  return loadingPromise;
}

export function isKokoroLoaded(): boolean {
  return kokoroInstance !== null;
}

export interface TTSPlaybackHandle {
  stop: () => void;
  pause: () => void;
  resume: () => void;
}

export function createBrowserTTS(
  text: string,
  voiceName: string,
  speed: number,
  voices: SpeechSynthesisVoice[],
  callbacks: {
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (err: unknown) => void;
  },
): TTSPlaybackHandle {
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  const voice = voices.find((v) => v.name === voiceName);
  if (voice) utterance.voice = voice;
  utterance.rate = speed;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;

  utterance.onstart = () => callbacks.onStart?.();
  utterance.onend = () => callbacks.onEnd?.();
  utterance.onerror = (e) => callbacks.onError?.(e);

  window.speechSynthesis.speak(utterance);

  return {
    stop: () => window.speechSynthesis.cancel(),
    pause: () => window.speechSynthesis.pause(),
    resume: () => window.speechSynthesis.resume(),
  };
}

export async function createKokoroTTS(
  text: string,
  voiceId: string,
  speed: number,
  callbacks: {
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (err: unknown) => void;
  },
  onProgress?: (progress: number, status: string) => void,
): Promise<TTSPlaybackHandle> {
  const tts = await loadKokoroModel(onProgress);

  const audio = await tts.generate(text, { voice: voiceId, speed });
  const blob = audio.toBlob();
  const url = URL.createObjectURL(blob);
  const player = new Audio(url);

  player.onplay = () => callbacks.onStart?.();
  player.onended = () => {
    URL.revokeObjectURL(url);
    callbacks.onEnd?.();
  };
  player.onerror = (e) => {
    URL.revokeObjectURL(url);
    callbacks.onError?.(e);
  };

  player.play().catch((err) => callbacks.onError?.(err));

  return {
    stop: () => {
      player.pause();
      player.currentTime = 0;
      player.onended = null;
      URL.revokeObjectURL(url);
      callbacks.onEnd?.();
    },
    pause: () => player.pause(),
    resume: () => player.play(),
  };
}

export function getProviderLabel(provider: TTSProvider): string {
  return provider === 'kokoro' ? 'Kokoro AI (Natural)' : 'Browser (Instant)';
}
