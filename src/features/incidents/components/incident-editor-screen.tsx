import { Redirect } from 'expo-router';
import { RoleGuard } from '@/shared/components/role-guard';

export default function IncidentEditorScreen() {
  return (
    <RoleGuard roles={['groom']}>
      <Redirect
        href={{ pathname: '/operations/[operation]', params: { operation: 'incidents.create' } }}
      />
    </RoleGuard>
  );
}
