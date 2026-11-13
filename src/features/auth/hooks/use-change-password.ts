import { authApi } from '../api/auth-api';
import { PasswordInput } from '../schemas/auth-schema';
import { sessionVersion, signOut } from '../utils/session';
import { useCredentialMutation } from './use-credential-mutation';
async function changePassword(input: PasswordInput) {
  const current = sessionVersion();
  await authApi.changePassword(input);
  if (current === sessionVersion()) await signOut('password-changed');
}
export function useChangePassword() {
  return useCredentialMutation(changePassword);
}
