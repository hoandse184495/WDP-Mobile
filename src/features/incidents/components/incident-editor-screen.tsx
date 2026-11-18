import { Redirect, useLocalSearchParams } from 'expo-router';
import { RoleGuard } from '@/shared/components/role-guard';

export default function IncidentEditorScreen() {
  const { horseId, stallId, taskId } = useLocalSearchParams<{
    horseId?: string;
    stallId?: string;
    taskId?: string;
  }>();
  return (
    <RoleGuard roles={['groom']}>
      <Redirect
        href={{
          pathname: '/operations/[operation]',
          params: {
            operation: 'incidents.create',
            ...(horseId ? { horseId } : {}),
            ...(stallId ? { stallId } : {}),
            ...(taskId ? { taskId } : {}),
          },
        }}
      />
    </RoleGuard>
  );
}
