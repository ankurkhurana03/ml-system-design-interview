import { describe, it, expect } from 'vitest';
import { parseVoiceCommand, parseInterruptCommand } from '@/utils/voiceCommands';

describe('parseVoiceCommand', () => {
  describe('continue commands', () => {
    it.each([
      'continue',
      'Continue',
      'next',
      'go on',
      'move on',
      'keep going',
      'go ahead',
      'next one',
    ])('recognizes "%s" as continue', (text) => {
      expect(parseVoiceCommand(text)).toEqual({ type: 'continue' });
    });
  });

  describe('go_back commands', () => {
    it.each(['go back', 'Go Back', 'back', 'previous'])('recognizes "%s" as go_back', (text) => {
      expect(parseVoiceCommand(text)).toEqual({ type: 'go_back' });
    });
  });

  describe('repeat commands', () => {
    it.each(['repeat', 'say that again', 'say again', 'one more time'])(
      'recognizes "%s" as repeat',
      (text) => {
        expect(parseVoiceCommand(text)).toEqual({ type: 'repeat' });
      },
    );
  });

  describe('select_option commands', () => {
    it('recognizes "option one" as select_option index 0', () => {
      expect(parseVoiceCommand('option one')).toEqual({ type: 'select_option', optionIndex: 0 });
    });

    it('recognizes "option two" as select_option index 1', () => {
      expect(parseVoiceCommand('option two')).toEqual({ type: 'select_option', optionIndex: 1 });
    });

    it('recognizes "choice three" as select_option index 2', () => {
      expect(parseVoiceCommand('choice three')).toEqual({ type: 'select_option', optionIndex: 2 });
    });

    it('recognizes "fourth option" as select_option index 3', () => {
      expect(parseVoiceCommand('fourth option')).toEqual({ type: 'select_option', optionIndex: 3 });
    });

    it('recognizes "first" as select_option index 0', () => {
      expect(parseVoiceCommand('first')).toEqual({ type: 'select_option', optionIndex: 0 });
    });

    it('recognizes "second" as select_option index 1', () => {
      expect(parseVoiceCommand('second')).toEqual({ type: 'select_option', optionIndex: 1 });
    });

    it('recognizes standalone "one" as select_option index 0', () => {
      expect(parseVoiceCommand('one')).toEqual({ type: 'select_option', optionIndex: 0 });
    });

    it('recognizes standalone "two" as select_option index 1', () => {
      expect(parseVoiceCommand('two')).toEqual({ type: 'select_option', optionIndex: 1 });
    });

    it('recognizes standalone "3" as select_option index 2', () => {
      expect(parseVoiceCommand('3')).toEqual({ type: 'select_option', optionIndex: 2 });
    });
  });

  describe('standalone numbers do NOT match in sentences', () => {
    it('does not match "one" in a sentence', () => {
      expect(parseVoiceCommand('I think one approach is to use batch processing')).toBeNull();
    });

    it('does not match "two" in a sentence', () => {
      expect(parseVoiceCommand('there are two main considerations')).toBeNull();
    });
  });

  describe('reset commands', () => {
    it.each(['start over', 'restart', 'reset'])('recognizes "%s" as reset', (text) => {
      expect(parseVoiceCommand(text)).toEqual({ type: 'reset' });
    });
  });

  describe('pause commands', () => {
    it.each(['pause', 'hold on', 'wait', 'stop'])('recognizes "%s" as pause', (text) => {
      expect(parseVoiceCommand(text)).toEqual({ type: 'pause' });
    });
  });

  describe('resume commands', () => {
    it.each(['resume', 'carry on'])('recognizes "%s" as resume', (text) => {
      expect(parseVoiceCommand(text)).toEqual({ type: 'resume' });
    });
  });

  describe('freeform text (no command)', () => {
    it('returns null for conversational text', () => {
      expect(parseVoiceCommand('I would use a gradient boosted model for this problem')).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(parseVoiceCommand('')).toBeNull();
    });

    it('returns null for whitespace only', () => {
      expect(parseVoiceCommand('   ')).toBeNull();
    });

    it('returns null for long technical answer', () => {
      expect(
        parseVoiceCommand(
          'For monitoring I would track prediction latency, accuracy drift, and feature distribution shifts',
        ),
      ).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('is case insensitive', () => {
      expect(parseVoiceCommand('CONTINUE')).toEqual({ type: 'continue' });
      expect(parseVoiceCommand('Option Two')).toEqual({ type: 'select_option', optionIndex: 1 });
    });

    it('handles extra whitespace', () => {
      expect(parseVoiceCommand('  continue  ')).toEqual({ type: 'continue' });
    });

    it('recognizes "continue" inside a longer transcript with word boundaries', () => {
      // "continue" as a word in context should match
      expect(parseVoiceCommand('please continue')).toEqual({ type: 'continue' });
    });

    it('does not match "discontinue"', () => {
      // Word boundary prevents matching "continue" inside "discontinue"
      expect(parseVoiceCommand('discontinue')).toBeNull();
    });
  });
});

describe('parseInterruptCommand', () => {
  it.each(['pause', 'Pause', 'PAUSE'])('detects "%s" in isolation', (text) => {
    expect(parseInterruptCommand(text)).toEqual({ type: 'pause' });
  });

  it.each(['stop', 'Stop'])('detects "%s" as pause interrupt', (text) => {
    expect(parseInterruptCommand(text)).toEqual({ type: 'pause' });
  });

  it('detects "hold on"', () => {
    expect(parseInterruptCommand('hold on')).toEqual({ type: 'pause' });
  });

  it('detects "wait"', () => {
    expect(parseInterruptCommand('wait')).toEqual({ type: 'pause' });
  });

  it('detects interrupt word inside partial interim transcript', () => {
    // Interim results often have extra words around the command
    expect(parseInterruptCommand('please stop')).toEqual({ type: 'pause' });
    expect(parseInterruptCommand('pause please')).toEqual({ type: 'pause' });
    expect(parseInterruptCommand('can you wait')).toEqual({ type: 'pause' });
  });

  it('returns null for non-interrupt text', () => {
    expect(parseInterruptCommand('continue')).toBeNull();
    expect(parseInterruptCommand('option one')).toBeNull();
    expect(parseInterruptCommand('I think we should use gradient boosting')).toBeNull();
  });

  it('returns null for empty/whitespace', () => {
    expect(parseInterruptCommand('')).toBeNull();
    expect(parseInterruptCommand('   ')).toBeNull();
  });
});
