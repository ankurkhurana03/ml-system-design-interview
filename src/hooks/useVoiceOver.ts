import { useContext } from 'react';
import { VoiceOverContext } from '@/context/VoiceOverContext';
import type { VoiceOverContextValue } from '@/context/VoiceOverContext';

export function useVoiceOver(): VoiceOverContextValue {
  const context = useContext(VoiceOverContext);
  if (!context) {
    throw new Error('useVoiceOver must be used within a VoiceOverProvider');
  }
  return context;
}
