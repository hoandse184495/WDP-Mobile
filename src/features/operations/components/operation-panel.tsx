import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { ActionMenu } from '@/shared/components/action-menu';
import { useSession } from '@/features/auth/stores/session-store';
import { operations, allowedOperation } from '../contracts/registry';
import { JsonRecord, entityId, Operation } from '../types/operation';
export function OperationPanel({
  module,
  record,
  collection = false,
  exclude = [],
}: {
  module: string;
  record?: JsonRecord;
  collection?: boolean;
  exclude?: string[];
}) {
  const user = useSession((state) => state.user);
  const client = useQueryClient();
  if (!user) return null;
  const actions = operations.filter(
    (op) =>
      !exclude.includes(op.id) &&
      op.module === module &&
      (collection
        ? op.scope === 'collection' || Boolean(op.recordSelection)
        : op.scope === 'record') &&
      (op.recordSelection && collection
        ? op.roles.includes(user.role)
        : allowedOperation(op, user.role, record, user._id)),
  );
  if (!actions.length) return null;
  const open = (op: Operation) => {
    const id = record ? entityId(record) : undefined;
    if (record) client.setQueryData(['operation-context', op.id, id], record);
    router.push({
      pathname: '/operations/[operation]',
      params: { operation: op.id, ...(id ? { id } : {}) },
    });
  };
  return (
    <ActionMenu
      title={collection ? 'Tạo mới & thao tác' : 'Thao tác với hồ sơ'}
      actions={actions.map((op) => ({ id: op.id, title: op.title, onPress: () => open(op) }))}
    />
  );
}
