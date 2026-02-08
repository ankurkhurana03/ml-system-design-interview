import { useEffect } from 'react';
import { useWizard } from '@/context/WizardContext';

/**
 * Custom hook for keyboard navigation in the wizard
 *
 * Shortcuts:
 * - Number keys (1-9): Select choice at question nodes
 * - Enter/Space: Continue at info nodes
 * - Backspace/Escape: Go back
 * - r: Reset
 */
export function useKeyboardNav(isActive: boolean = true) {
  const { currentNode, selectChoice, advance, goBack, reset } = useWizard();

  useEffect(() => {
    if (!isActive || !currentNode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input or textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      // Number keys (1-9) to select choices (skip for multi_select)
      if (currentNode.type === 'question' && currentNode.choices) {
        const num = parseInt(e.key, 10);
        if (num >= 1 && num <= currentNode.choices.length) {
          e.preventDefault();
          selectChoice(num - 1);
          return;
        }
      }

      // Multi-select nodes don't support keyboard shortcuts for selection

      // Enter or Space to continue at info nodes
      if (currentNode.type === 'info' && currentNode.next) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          advance();
          return;
        }
      }

      // Backspace or Escape to go back
      if (e.key === 'Backspace' || e.key === 'Escape') {
        e.preventDefault();
        goBack();
        return;
      }

      // 'r' to reset
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        reset();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isActive, currentNode, selectChoice, advance, goBack, reset]);
}
