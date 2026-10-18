import { createContext, useContext } from 'react';

export interface UserGuideContextValue {
  startGuide: () => void;
}

export const UserGuideContext = createContext<UserGuideContextValue | null>(null);

export const useUserGuide = (): UserGuideContextValue => {
  const context = useContext(UserGuideContext);

  if (!context) {
    throw new Error('useUserGuide must be used within UserGuideProvider');
  }

  return context;
};
