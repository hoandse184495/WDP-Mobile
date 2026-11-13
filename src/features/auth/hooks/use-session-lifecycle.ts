import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { focusManager } from '@tanstack/react-query';
import { restoreSession } from '../utils/session';
import { useCurrentUser } from './use-current-user';

export function useSessionLifecycle() {
  useCurrentUser();
  useEffect(() => {
    void restoreSession();
    if (Platform.OS !== 'web') focusManager.setFocused(AppState.currentState === 'active');
    const subscription = AppState.addEventListener('change', (status) => {
      if (Platform.OS !== 'web') focusManager.setFocused(status === 'active');
    });
    return () => subscription.remove();
  }, []);
}
