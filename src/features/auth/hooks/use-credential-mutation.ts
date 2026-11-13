import { useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { AppError, toAppError } from '@/core/errors/app-error';

// Credentials belong only to the in-flight request, not a retained mutation cache.
export function useCredentialMutation<T>(mutationFn: (input: T) => Promise<void>) {
  const [error, setError] = useState<AppError | null>(null);
  const inFlight = useRef(false);
  const mutation = useMutation({ mutationFn, retry: false, gcTime: 0 });
  const submit = async (input: T) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setError(null);
    try {
      await mutation.mutateAsync(input);
    } catch (failure) {
      setError(toAppError(failure));
    } finally {
      mutation.reset();
      inFlight.current = false;
    }
  };
  return { submit, error, isPending: mutation.isPending };
}
