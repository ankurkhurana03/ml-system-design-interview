import { describe, it, expect } from 'vitest';
import { MODE_PRESETS } from '@/context/ModeContext';
import type { InterviewMode, ModeConfig } from '@/types/tree';

describe('ModeContext', () => {
  describe('MODE_PRESETS', () => {
    it('should have presets for all three modes', () => {
      expect(MODE_PRESETS).toHaveProperty('mock_interview');
      expect(MODE_PRESETS).toHaveProperty('tutor');
      expect(MODE_PRESETS).toHaveProperty('designer');
    });

    it('mock_interview should hide graph and hints', () => {
      const config = MODE_PRESETS.mock_interview;
      expect(config.showGraph).toBe(false);
      expect(config.showHints).toBe(false);
      expect(config.showAskAI).toBe(false);
      expect(config.showComments).toBe(false);
      expect(config.showKeyboardHints).toBe(false);
    });

    it('mock_interview should enforce timer and be driving-friendly', () => {
      const config = MODE_PRESETS.mock_interview;
      expect(config.timerEnforced).toBe(true);
      expect(config.drivingFriendly).toBe(true);
      expect(config.voiceAutoEnabled).toBe(true);
    });

    it('tutor should show all learning aids', () => {
      const config = MODE_PRESETS.tutor;
      expect(config.showGraph).toBe(true);
      expect(config.showHints).toBe(true);
      expect(config.showAskAI).toBe(true);
      expect(config.showComments).toBe(true);
      expect(config.showExplanations).toBe(true);
      expect(config.pauseForUnderstanding).toBe(true);
      expect(config.useDialogue).toBe(true);
    });

    it('designer should show everything', () => {
      const config = MODE_PRESETS.designer;
      expect(config.showGraph).toBe(true);
      expect(config.showHints).toBe(true);
      expect(config.showAskAI).toBe(true);
      expect(config.showNotes).toBe(true);
      expect(config.showComparison).toBe(true);
      expect(config.showKeyboardHints).toBe(true);
    });

    it('designer should not be driving-friendly', () => {
      const config = MODE_PRESETS.designer;
      expect(config.drivingFriendly).toBe(false);
      expect(config.voiceAutoEnabled).toBe(false);
      expect(config.useDialogue).toBe(false);
    });

    it('mock_interview should use dialogue mode', () => {
      const config = MODE_PRESETS.mock_interview;
      expect(config.useDialogue).toBe(true);
    });

    it('each preset mode field should match its key', () => {
      const modes: InterviewMode[] = ['mock_interview', 'tutor', 'designer'];
      for (const mode of modes) {
        expect(MODE_PRESETS[mode].mode).toBe(mode);
      }
    });

    it('all presets should have all required ModeConfig fields', () => {
      const requiredFields: (keyof ModeConfig)[] = [
        'mode', 'timerEnforced', 'autoAdvanceInfo', 'showHints',
        'showComparison', 'showNotes', 'showComments', 'showAskAI',
        'showGraph', 'showKeyboardHints', 'voiceAutoEnabled',
        'drivingFriendly', 'showExplanations', 'pauseForUnderstanding', 'useDialogue',
      ];

      for (const [, config] of Object.entries(MODE_PRESETS)) {
        for (const field of requiredFields) {
          expect(config).toHaveProperty(field);
        }
      }
    });
  });

  describe('Mode switching', () => {
    it('switching modes changes the config', () => {
      let currentMode: InterviewMode = 'designer';
      let config = MODE_PRESETS[currentMode];

      expect(config.showGraph).toBe(true);

      currentMode = 'mock_interview';
      config = MODE_PRESETS[currentMode];

      expect(config.showGraph).toBe(false);
    });

    it('mode persistence uses valid InterviewMode values', () => {
      const validModes: InterviewMode[] = ['mock_interview', 'tutor', 'designer'];

      for (const mode of validModes) {
        expect(MODE_PRESETS[mode]).toBeDefined();
      }
    });
  });
});
