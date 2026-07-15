import { createContext, useContext } from 'react';

export type CheckInDialogContextValue = {
  openSearch: () => void;
  recordSubscriber: (subscriberId: string) => Promise<void>;
};

export const CheckInDialogContext = createContext<CheckInDialogContextValue | null>(null);

export function useCheckInDialog() {
  const context = useContext(CheckInDialogContext);

  if (!context) {
    throw new Error('useCheckInDialog must be used within CheckInDialogProvider.');
  }

  return context;
}
