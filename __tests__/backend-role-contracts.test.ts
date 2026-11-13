import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { operations } from '@/features/operations/contracts/registry';
import { modules } from '@/features/workspace/types/catalog';
import type { Role } from '@/core/constants/roles';

interface Route {
  method: string;
  path: string;
  roles: Role[];
}
const backend = resolve(process.cwd(), '../../Racehorse-_Training-Management_System_BE');
const inspector = resolve(process.cwd(), 'scripts/inspect-backend-routes.cjs');
const exported = existsSync(inspector)
  ? spawnSync(process.execPath, [inspector, backend], {
      encoding: 'utf8',
      cwd: backend,
      timeout: 20000,
    })
  : undefined;
if (exported && exported.status !== 0)
  throw new Error(`Cannot inspect backend route contracts: ${exported.stderr}`);
const routes: Route[] = exported ? JSON.parse(exported.stdout) : [];
const contractTest = exported ? test : test.skip;
const normalize = (path: string) => path.replace(/:[^/]+/g, ':id').replace(/\/$/, '');
const routeFor = (method: string, path: string) =>
  routes.find(
    (route) => route.method === method && normalize(route.path) === normalize(`/api${path}`),
  );

contractTest.each(operations)('$id uses an existing endpoint and authorized roles', (operation) => {
  const route = routeFor(operation.method, operation.path);
  expect(route).toBeDefined();
  expect(operation.roles.filter((role) => !route!.roles.includes(role))).toEqual([]);
  for (const path of [operation.contextPath, operation.previewPath].filter(
    (value): value is string => Boolean(value),
  )) {
    const method = path === operation.previewPath ? (operation.previewMethod ?? 'post') : 'get';
    const context = routeFor(method, path);
    expect({ operation: operation.id, path, exists: Boolean(context) }).toEqual({
      operation: operation.id,
      path,
      exists: true,
    });
    expect(operation.roles.filter((role) => !context!.roles.includes(role))).toEqual([]);
  }
  for (const reference of [
    ...Object.values(operation.references ?? {}),
    ...(operation.recordSelection ? [operation.recordSelection] : []),
  ]) {
    const options = routeFor('get', reference.path);
    expect({ operation: operation.id, path: reference.path, exists: Boolean(options) }).toEqual({
      operation: operation.id,
      path: reference.path,
      exists: true,
    });
    expect(operation.roles.filter((role) => !options!.roles.includes(role))).toEqual([]);
  }
});
contractTest.each(Object.entries(modules))(
  '%s listing uses a permitted backend route',
  (_key, module) => {
    const route = routeFor('get', module.path);
    expect(route).toBeDefined();
    expect(module.roles.filter((role) => !route!.roles.includes(role))).toEqual([]);
  },
);
