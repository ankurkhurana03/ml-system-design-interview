import { useContext } from 'react';
import { WizardContext } from '@/context/WizardContext';

export function useWizardState() {
  const context = useContext(WizardContext);

  if (!context) {
    throw new Error('useWizardState must be used within a WizardProvider');
  }

  return context;
}
