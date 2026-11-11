import { execFileSync } from 'node:child_process';
import path from 'node:path';

export default function setup() {
  execFileSync(process.execPath, [path.join(__dirname, '..', 'scripts', 'db.js'), 'migrate', 'deploy'], {
    stdio: 'inherit',
    env: { ...process.env, DB_SCHEMA: process.env.TEST_DB_SCHEMA || 'college_event_test' },
  });
}
