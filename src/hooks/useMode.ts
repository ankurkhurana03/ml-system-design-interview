import { useContext } from 'react';
import { ModeContext } from '@/context/ModeContext';

export function useMode() {
  const context = useContext(ModeContext);
  if (!context) {
    throw new Error('useMode must be used within a ModeProvider');
  }
  return context;
}
