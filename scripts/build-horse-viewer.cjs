const fs = require('node:fs');
const path = require('node:path');
const { buildSync } = require('esbuild');
const root = path.resolve(__dirname, '..');
const result = buildSync({
  entryPoints: [path.join(__dirname, 'horse-viewer/entry.js')],
  bundle: true,
  minify: true,
  format: 'iife',
  platform: 'browser',
  target: ['chrome100', 'safari16'],
  write: false,
  legalComments: 'eof',
});
fs.writeFileSync(
  path.join(root, 'assets/models/viewer-runtime.json'),
  JSON.stringify({ script: result.outputFiles[0].text }) + '\n',
);
console.log('Built offline horse viewer (' + result.outputFiles[0].text.length + ' bytes)');
