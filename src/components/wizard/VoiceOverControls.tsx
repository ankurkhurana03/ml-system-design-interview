import { useState } from 'react';
import type { Speaker, TTSProvider } from '@/types/tree';
import type { KokoroVoiceInfo } from '@/lib/ttsEngine';

interface VoiceOverControlsProps {
  isPlaying: boolean;
  isPaused: boolean;
  rate: number;
  autoAdvance: boolean;
  currentSpeaker: Speaker | null;
  onPlayPause: () => void;
  onStop: () => void;
  onRateChange: (rate: number) => void;
  onAutoAdvanceToggle: () => void;
  // Kokoro TTS props
  ttsProvider: TTSProvider;
  onProviderChange: (provider: TTSProvider) => void;
  modelLoading: boolean;
  modelProgress: number;
  modelStatus: string;
  modelReady: boolean;
  onLoadModel: () => void;
  kokoroVoices: KokoroVoiceInfo[];
  kokoroInterviewerVoice: string;
  kokoroCandidateVoice: string;
  onKokoroInterviewerVoiceChange: (voice: string) => void;
  onKokoroCandidateVoiceChange: (voice: string) => void;
}

const SPEED_OPTIONS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

export function VoiceOverControls({
  isPlaying,
  isPaused,
  rate,
  autoAdvance,
  currentSpeaker,
  onPlayPause,
  onStop,
  onRateChange,
  onAutoAdvanceToggle,
  ttsProvider,
  onProviderChange,
  modelLoading,
  modelProgress,
  modelStatus,
  modelReady,
  onLoadModel,
  kokoroVoices,
  kokoroInterviewerVoice,
  kokoroCandidateVoice,
  onKokoroInterviewerVoiceChange,
  onKokoroCandidateVoiceChange,
}: VoiceOverControlsProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);

  const groupedVoices = {
    'American Female': kokoroVoices.filter(v => v.language === 'American' && v.gender === 'Female'),
    'American Male': kokoroVoices.filter(v => v.language === 'American' && v.gender === 'Male'),
    'British Female': kokoroVoices.filter(v => v.language === 'British' && v.gender === 'Female'),
    'British Male': kokoroVoices.filter(v => v.language === 'British' && v.gender === 'Male'),
  };

  return (
    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-200">
      <div className="px-4 py-2">
        <div className="flex items-center justify-between">
          {/* Left: Toggle button and speaker label */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 hover:bg-white/60 rounded-lg transition-colors"
              title={isExpanded ? 'Collapse voice controls' : 'Expand voice controls'}
            >
              <svg
                className={`w-5 h-5 text-indigo-600 transition-transform ${
                  isExpanded ? 'rotate-0' : 'rotate-180'
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {/* TTS Provider indicator */}
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              ttsProvider === 'kokoro'
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-gray-100 text-gray-600'
            }`}>
              {ttsProvider === 'kokoro' ? 'Kokoro AI' : 'Browser'}
            </span>

            {currentSpeaker && (
              <div className="flex items-center gap-2 px-3 py-1 bg-white/60 rounded-full">
                <div
                  className={`w-2 h-2 rounded-full animate-pulse ${
                    isPlaying && !isPaused ? 'bg-red-500' : 'bg-gray-400'
                  }`}
                />
                <span className="text-sm font-medium text-gray-700">
                  {currentSpeaker === 'interviewer' ? 'Interviewer' : 'Candidate'}
                </span>
              </div>
            )}
          </div>

          {/* Right: Main controls */}
          <div className="flex items-center gap-2">
            {isExpanded && (
              <>
                {/* Play/Pause Button */}
                <button
                  onClick={onPlayPause}
                  disabled={!isPlaying && !isPaused}
                  className="p-2 hover:bg-white/60 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title={isPaused ? 'Resume' : isPlaying ? 'Pause' : 'Play'}
                >
                  {isPaused || !isPlaying ? (
                    <svg
                      className="w-5 h-5 text-indigo-600"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-5 h-5 text-indigo-600"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>

                {/* Stop Button */}
                <button
                  onClick={onStop}
                  disabled={!isPlaying && !isPaused}
                  className="p-2 hover:bg-white/60 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Stop"
                >
                  <svg
                    className="w-5 h-5 text-indigo-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>

                <div className="w-px h-6 bg-indigo-300 mx-1" />

                {/* Speed Control */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-600 font-medium">Speed:</span>
                  <div className="flex items-center gap-1">
                    {SPEED_OPTIONS.map((speed) => (
                      <button
                        key={speed}
                        onClick={() => onRateChange(speed)}
                        className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                          rate === speed
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white/60 text-gray-700 hover:bg-white'
                        }`}
                        title={`${speed}x speed`}
                      >
                        {speed}x
                      </button>
                    ))}
                  </div>
                </div>

                <div className="w-px h-6 bg-indigo-300 mx-1" />

                {/* Auto-advance Toggle */}
                <button
                  onClick={onAutoAdvanceToggle}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    autoAdvance
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white/60 text-gray-700 hover:bg-white'
                  }`}
                  title={autoAdvance ? 'Auto-advance enabled' : 'Auto-advance disabled'}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 5l7 7-7 7M5 5l7 7-7 7"
                    />
                  </svg>
                  <span>Auto</span>
                </button>

                <div className="w-px h-6 bg-indigo-300 mx-1" />

                {/* Voice Settings Toggle */}
                <button
                  onClick={() => setShowVoiceSettings(!showVoiceSettings)}
                  className={`p-2 rounded-lg transition-colors ${
                    showVoiceSettings ? 'bg-indigo-600 text-white' : 'hover:bg-white/60 text-indigo-600'
                  }`}
                  title="Voice settings"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Model Loading Progress */}
        {modelLoading && (
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
              <span>{modelStatus}</span>
              <span>{Math.round(modelProgress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div
                className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${modelProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Voice Settings Panel */}
        {showVoiceSettings && isExpanded && (
          <div className="mt-3 pt-3 border-t border-indigo-200 space-y-3">
            {/* TTS Provider Toggle */}
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1.5">TTS Engine</label>
              <div className="flex gap-2">
                <button
                  onClick={() => onProviderChange('browser')}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
                    ttsProvider === 'browser'
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-400'
                  }`}
                >
                  <div className="text-center">
                    <div>Browser TTS</div>
                    <div className={`text-xs mt-0.5 ${ttsProvider === 'browser' ? 'text-indigo-200' : 'text-gray-500'}`}>
                      Instant, basic quality
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    onProviderChange('kokoro');
                    if (!modelReady && !modelLoading) {
                      onLoadModel();
                    }
                  }}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
                    ttsProvider === 'kokoro'
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-emerald-400'
                  }`}
                >
                  <div className="text-center">
                    <div>Kokoro AI</div>
                    <div className={`text-xs mt-0.5 ${ttsProvider === 'kokoro' ? 'text-emerald-200' : 'text-gray-500'}`}>
                      Natural speech, ~92MB
                    </div>
                  </div>
                </button>
              </div>
              {ttsProvider === 'kokoro' && !modelReady && !modelLoading && (
                <button
                  onClick={onLoadModel}
                  className="mt-2 w-full px-3 py-1.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors"
                >
                  Download Model
                </button>
              )}
              {ttsProvider === 'kokoro' && modelReady && (
                <div className="mt-1.5 flex items-center gap-1.5 text-xs text-emerald-600">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Model ready
                </div>
              )}
            </div>

            {/* Kokoro Voice Selectors */}
            {ttsProvider === 'kokoro' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">Interviewer Voice</label>
                  <select
                    value={kokoroInterviewerVoice}
                    onChange={(e) => onKokoroInterviewerVoiceChange(e.target.value)}
                    className="w-full text-xs border border-gray-300 rounded-lg px-2 py-1.5 bg-white"
                  >
                    {Object.entries(groupedVoices).map(([group, voices]) => (
                      <optgroup key={group} label={group}>
                        {voices.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name}{v.traits ? ` (${v.traits})` : ''}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">Candidate Voice</label>
                  <select
                    value={kokoroCandidateVoice}
                    onChange={(e) => onKokoroCandidateVoiceChange(e.target.value)}
                    className="w-full text-xs border border-gray-300 rounded-lg px-2 py-1.5 bg-white"
                  >
                    {Object.entries(groupedVoices).map(([group, voices]) => (
                      <optgroup key={group} label={group}>
                        {voices.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name}{v.traits ? ` (${v.traits})` : ''}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
