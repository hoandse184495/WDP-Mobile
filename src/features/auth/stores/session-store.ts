import { create } from 'zustand';
import { User } from '../types/auth';
interface SessionState {
  status:
    'restoring' | 'guest' | 'authenticated' | 'restore-error' | 'signing-out' | 'signout-error';
  user: User | null;
  error: Error | null;
  notice: string | null;
}
export const useSession = create<SessionState>(() => ({
  status: 'restoring',
  user: null,
  error: null,
  notice: null,
}));
