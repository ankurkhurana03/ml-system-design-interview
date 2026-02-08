export type VoiceCommandType =
  | 'continue'
  | 'go_back'
  | 'repeat'
  | 'select_option'
  | 'reset'
  | 'pause'
  | 'resume';

export interface VoiceCommand {
  type: VoiceCommandType;
  optionIndex?: number; // 0-based, only for 'select_option'
}

interface CommandPattern {
  type: VoiceCommandType;
  patterns: RegExp[];
  optionIndex?: number;
}

const COMMAND_PATTERNS: CommandPattern[] = [
  // Navigation
  {
    type: 'continue',
    patterns: [
      /\b(?:continue|next|go\s+on|move\s+on|keep\s+going|go\s+ahead|next\s+one)\b/i,
    ],
  },
  {
    type: 'go_back',
    patterns: [/\b(?:go\s+back|previous)\b/i, /^back$/i],
  },
  {
    type: 'repeat',
    patterns: [
      /\b(?:repeat|say\s+that\s+again|say\s+again|one\s+more\s+time)\b/i,
    ],
  },
  // Reset / flow control
  {
    type: 'reset',
    patterns: [/\b(?:start\s+over|restart)\b/i, /^reset$/i],
  },
  {
    type: 'pause',
    patterns: [/^(?:pause|hold\s+on|wait|stop)$/i],
  },
  {
    type: 'resume',
    patterns: [/\b(?:resume|carry\s+on)\b/i],
  },
  // Option selection — explicit patterns
  {
    type: 'select_option',
    optionIndex: 0,
    patterns: [
      /\b(?:option|choice)\s+(?:one|1)\b/i,
      /\b(?:first)\s+(?:option|choice|one)\b/i,
      /^(?:the\s+)?first$/i,
    ],
  },
  {
    type: 'select_option',
    optionIndex: 1,
    patterns: [
      /\b(?:option|choice)\s+(?:two|2)\b/i,
      /\b(?:second)\s+(?:option|choice|one)\b/i,
      /^(?:the\s+)?second$/i,
    ],
  },
  {
    type: 'select_option',
    optionIndex: 2,
    patterns: [
      /\b(?:option|choice)\s+(?:three|3)\b/i,
      /\b(?:third)\s+(?:option|choice|one)\b/i,
      /^(?:the\s+)?third$/i,
    ],
  },
  {
    type: 'select_option',
    optionIndex: 3,
    patterns: [
      /\b(?:option|choice)\s+(?:four|4)\b/i,
      /\b(?:fourth)\s+(?:option|choice|one)\b/i,
      /^(?:the\s+)?fourth$/i,
    ],
  },
];

// Standalone single-word numbers — only match when the entire transcript is that word
const STANDALONE_NUMBER_MAP: Record<string, number> = {
  one: 0,
  two: 1,
  three: 2,
  four: 3,
  '1': 0,
  '2': 1,
  '3': 2,
  '4': 3,
};

/**
 * Interrupt commands that can be detected from interim (partial) transcripts.
 * Used during TTS playback so the user can say "pause" or "stop" mid-sentence.
 * Intentionally limited to unambiguous interrupt words to avoid false positives
 * from TTS echo being misrecognized.
 */
const INTERRUPT_PATTERNS: { type: VoiceCommandType; pattern: RegExp }[] = [
  { type: 'pause', pattern: /\bpause\b/i },
  { type: 'pause', pattern: /\bstop\b/i },
  { type: 'pause', pattern: /\bhold\s+on\b/i },
  { type: 'pause', pattern: /\bwait\b/i },
];

/**
 * Check interim/partial transcript for interrupt commands only.
 * Returns a pause command if an interrupt word is found, null otherwise.
 * This is used during TTS playback where we can't wait for isFinal.
 */
export function parseInterruptCommand(text: string): VoiceCommand | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  for (const { type, pattern } of INTERRUPT_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { type };
    }
  }
  return null;
}

/**
 * Parse a speech transcript into a voice command, or null if it's freeform text.
 */
export function parseVoiceCommand(text: string): VoiceCommand | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  // Check standalone single-word numbers first
  const lower = trimmed.toLowerCase();
  if (lower in STANDALONE_NUMBER_MAP) {
    return {
      type: 'select_option',
      optionIndex: STANDALONE_NUMBER_MAP[lower],
    };
  }

  // Check command patterns
  for (const cmd of COMMAND_PATTERNS) {
    for (const pattern of cmd.patterns) {
      if (pattern.test(trimmed)) {
        return {
          type: cmd.type,
          ...(cmd.optionIndex !== undefined
            ? { optionIndex: cmd.optionIndex }
            : {}),
        };
      }
    }
  }

  return null;
}
