import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // Tests run against a real Postgres, in their own schema so demo data is untouched.
    env: { NODE_ENV: 'test', DB_SCHEMA: process.env.TEST_DB_SCHEMA || 'college_event_test', ENABLE_CRON: 'false' },
    globalSetup: './tests/global-setup.ts',
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 120000,
  },
});
