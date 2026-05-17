const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, 'package.json');
let s = fs.readFileSync(p, 'utf8');
const start = s.indexOf('  "scripts": {');
const end = s.indexOf('\n  "eslintConfig":', start);
if (start === -1 || end === -1) {
  throw new Error('Could not find scripts block or eslintConfig');
}
const prefix = s.slice(0, start);
const suffix = s.slice(end);
const scriptsBlock = [
  '  "scripts": {',
  '    "start": "react-scripts start",',
  '    "build": "react-scripts build",',
  '    "test": "react-scripts test --watchAll=false",',
  '    "test:jest": "jest --config jest.config.js",',
  '    "eject": "react-scripts eject"',
  '  },',
].join('\n');
fs.writeFileSync(p, prefix + scriptsBlock + suffix, 'utf8');
console.log('package.json repaired');
