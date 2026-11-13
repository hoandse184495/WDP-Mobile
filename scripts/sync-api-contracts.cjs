// Reads public validation contracts only; never reads .env or connects to a database.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const backend = path.resolve(process.argv[2] || '../../Racehorse-_Training-Management_System_BE');
const root = path.resolve(__dirname, '..');
const { z } = require(path.join(backend, 'node_modules/zod'));
const names = ['admission', 'horse', 'pedigree', 'stable', 'floorPlan', 'medicalRecord', 'medicalEncounter', 'injury', 'injuryLocation', 'medicalSchedule', 'ration', 'prescription', 'inventory', 'stocktake', 'stockLedger', 'stockDisposal', 'replenishment', 'dailyTask', 'taskAlert', 'incident', 'user', 'trainingSession', 'trainingPlan', 'feedingStock', 'password', 'auditLog'];
const contracts = {};
for (const name of names) {
  const file = path.join(backend, 'src/utils', `${name}.schema.js`);
  if (!fs.existsSync(file)) continue;
  const module = require(file);
  for (const [key, value] of Object.entries(module)) {
    if (!value || typeof value.safeParse !== 'function') continue;
    const schema = z.toJSONSchema(value, { io: 'input', unrepresentable: 'any' });
    contracts[`${name}.${key}`] = schema;
    const fields = Object.keys(schema.properties || {});
    process.stdout.write(`${name}.${key}: ${fields.join(', ')}\n`);
  }
}
const destination = path.join(root, 'src/features/operations/contracts/generated-schemas.json');
if (!destination.startsWith(root + path.sep)) throw new Error('Invalid mobile output path');
fs.mkdirSync(path.dirname(destination), { recursive: true });
fs.writeFileSync(destination, JSON.stringify(contracts, null, 2) + '\n');
const fingerprint = crypto.createHash('sha256').update(JSON.stringify(contracts)).digest('hex');
fs.writeFileSync(path.join(root, 'src/features/operations/contracts/source.json'), JSON.stringify({ source: 'Backend Zod input schemas (no secrets)', sha256: fingerprint, count: Object.keys(contracts).length }, null, 2) + '\n');
