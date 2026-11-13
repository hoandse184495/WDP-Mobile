import { Operation, ReferenceSource } from '../types/operation';
import { Role } from '@/core/constants/roles';
export const manager: Role[] = ['club_manager'];
export const keeper: Role[] = ['warehouse_keeper'];
export const vet: Role[] = ['veterinarian'];
export const trainer: Role[] = ['head_trainer'];
export const groom: Role[] = ['groom'];
export const owner: Role[] = ['horse_owner'];
export const stockRoles: Role[] = ['club_manager', 'warehouse_keeper', 'groom'];
export function operation(
  module: string,
  name: string,
  title: string,
  path: string,
  contract: string,
  roles: readonly Role[],
  scope: 'collection' | 'record' = 'record',
  extra: Partial<Operation> = {},
): Operation {
  return {
    id: `${module}.${name}`,
    module,
    title,
    path,
    contract,
    roles,
    scope,
    method: 'post',
    ...extra,
  };
}
export const users = (role?: Role): ReferenceSource => ({
  path: '/users',
  key: 'users',
  paged: true,
  params: role ? { role } : undefined,
});
export const stables: ReferenceSource = { path: '/stables', key: 'stables' };
export const stalls: ReferenceSource = { path: '/stables', key: 'stalls' };
export const horses: ReferenceSource = { path: '/horses', key: 'horses', paged: true };
export const warehouses: ReferenceSource = {
  path: '/inventory/warehouses',
  key: 'warehouses',
  paged: true,
};
export const stock: ReferenceSource = {
  path: '/inventory/stock',
  key: 'balances',
  paged: true,
  dependsOn: 'sourceWarehouseId',
  parameter: 'warehouseId',
};
export const items: ReferenceSource = { path: '/inventory/items', key: 'items', paged: true };
