import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function walk(d) {
  let rs = [];
  const l = fs.readdirSync(d);
  for (const f of l) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) {
      rs = rs.concat(walk(p));
    } else if (p.endsWith('.ts') || p.endsWith('.tsx')) {
      rs.push(p);
    }
  }
  return rs;
}

const files = walk(path.join(__dirname, 'src'));
let changed = 0;

for (const f of files) {
  const oldC = fs.readFileSync(f, 'utf8');
  // Only replace 'import { ... } from "@/types";' where NOT already 'import type'
  // using regex to ensure we grab multi-line imports too.
  const newC = oldC.replace(/import\s+{([\s\S]+?)}\s+from\s+['"]@\/types['"];/g, 'import type { $1 } from \'@/types\';');
  
  if (oldC !== newC) {
    fs.writeFileSync(f, newC, 'utf8');
    console.log('Fixed ' + f);
    changed++;
  }
}

console.log('Done, changed ' + changed + ' files.');
