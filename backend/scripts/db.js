#!/usr/bin/env node
/**
 * Runs the Prisma CLI against DATABASE_URL scoped to DB_SCHEMA.
 * All apps share one Postgres database, so every table lives in its own schema.
 * Usage: node scripts/db.js migrate deploy
 */
require('dotenv').config();
const { execFileSync } = require('node:child_process');

const schema = process.env.DB_SCHEMA || 'college_event';
if (!/^[a-z_][a-z0-9_]{0,62}$/.test(schema)) {
  console.error(`Invalid DB_SCHEMA "${schema}"`);
  process.exit(1);
}

const url = new URL(process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/portfolio');
url.searchParams.set('schema', schema);

const prismaCli = require.resolve('prisma/build/index.js');
const args = process.argv.slice(2);
const run = (cliArgs, opts = {}) =>
  execFileSync(process.execPath, [prismaCli, ...cliArgs], {
    stdio: opts.input ? ['pipe', 'inherit', 'inherit'] : 'inherit',
    env: { ...process.env, DATABASE_URL: url.toString() },
    ...opts,
  });

if (args[0] === 'migrate') {
  run(['db', 'execute', '--stdin', '--url', url.toString()], { input: `CREATE SCHEMA IF NOT EXISTS "${schema}";` });
}
run(args);
