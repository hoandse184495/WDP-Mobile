import { useState } from 'react';
import { Text } from 'react-native';
import { router } from 'expo-router';
import { ui } from '@/core/theme/theme';
import { RoleGuard } from '@/shared/components/role-guard';
import { Button, Card, Screen } from '@/shared/components/ui';
import { ReferenceField } from '@/features/operations/components/reference-field';
import type { Operation } from '@/features/operations/types/operation';

const operation: Operation = {
  id: 'ledger.select',
  title: 'Sổ kho',
  module: 'inventory',
  scope: 'collection',
  method: 'post',
  path: '/inventory/ledger',
  contract: 'empty',
  roles: ['club_manager', 'warehouse_keeper'],
};
export default function LedgerPickerScreen() {
  const [selection, setSelection] = useState<Record<string, unknown>>({});
  return (
    <RoleGuard roles={operation.roles}>
      <Screen>
        <Text style={ui.title}>Sổ kho</Text>
        <Text style={ui.muted}>Chọn kho và vật tư để xem nhập, xuất, tồn và chứng từ gốc.</Text>
        <Card>
          {['warehouseId', 'itemId'].map((key) => (
            <ReferenceField
              key={key}
              operation={operation}
              path={key}
              value={selection[key]}
              payload={selection}
              context={{}}
              onChange={(value) => setSelection((old) => ({ ...old, [key]: value }))}
            />
          ))}
          <Button
            title="Xem sổ kho"
            disabled={!selection.warehouseId || !selection.itemId}
            onPress={() =>
              router.push({
                pathname: '/ledger',
                params: {
                  warehouseId: String(selection.warehouseId),
                  itemId: String(selection.itemId),
                },
              })
            }
          />
        </Card>
      </Screen>
    </RoleGuard>
  );
}
