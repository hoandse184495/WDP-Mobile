import { signIn } from '../utils/session';
import { useCredentialMutation } from './use-credential-mutation';
export function useLogin() {
  return useCredentialMutation(signIn);
}
