// Read-only route introspection in a separate process: no server, database or requests.
const path = require('node:path');
const backend = path.resolve(process.argv[2] || '../../Racehorse-_Training-Management_System_BE');
const express = require(path.join(backend, 'node_modules/express'));
const auth = require(path.join(backend, 'src/middleware/auth.middleware'));
const allRoles = [
  'club_manager',
  'head_trainer',
  'groom',
  'veterinarian',
  'horse_owner',
  'warehouse_keeper',
];
auth.protect = (_req, _res, next) => next();
auth.authorize = (...roles) => Object.assign((_req, _res, next) => next(), { auditRoles: roles });
const mounts = [];
const nestedPaths = new WeakMap();
const originalRouter = express.Router;
express.Router = function (...args) {
  const router = originalRouter(...args);
  const originalRouterUse = router.use;
  router.use = function (...values) {
    const start = this.stack.length;
    const result = originalRouterUse.apply(this, values);
    if (typeof values[0] === 'string') {
      for (const layer of this.stack.slice(start))
        if (layer.handle?.stack) nestedPaths.set(layer, values[0]);
    }
    return result;
  };
  return router;
};
const originalUse = express.application.use;
express.application.use = function (...args) {
  if (typeof args[0] === 'string' && args[0].startsWith('/api/')) {
    for (const router of args.slice(1)) if (router?.stack) mounts.push({ prefix: args[0], router });
  }
  return originalUse.apply(this, args);
};
const originalLog = console.log;
try {
  console.log = () => {};
  require(path.join(backend, 'app'));
} finally {
  console.log = originalLog;
  express.application.use = originalUse;
  express.Router = originalRouter;
}
const routes = [];
const intersect = (roles, handle) =>
  handle.auditRoles ? roles.filter((role) => handle.auditRoles.includes(role)) : roles;
function inspect(prefix, router, inherited = allRoles) {
  let shared = inherited;
  for (const layer of router.stack) {
    if (layer.handle?.stack && nestedPaths.has(layer)) {
      inspect(prefix + nestedPaths.get(layer), layer.handle, shared);
      continue;
    }
    if (!layer.route) {
      shared = intersect(shared, layer.handle);
      continue;
    }
    let roles = shared;
    for (const handler of layer.route.stack) roles = intersect(roles, handler.handle);
    for (const method of Object.keys(layer.route.methods)) {
      routes.push({ method, path: (prefix + layer.route.path).replace(/\/$/, ''), roles });
    }
  }
}
for (const { prefix, router } of mounts) inspect(prefix, router);
process.stdout.write(JSON.stringify(routes, null, 2) + '\n');
