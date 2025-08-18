import { useContext } from 'react';
import { NostrContext } from '@/contexts/NostrContextType';

export const useNostr = () => {
  const context = useContext(NostrContext);
  if (!context) {
    throw new Error('useNostr must be used within NostrProvider');
  }
  return context;
};