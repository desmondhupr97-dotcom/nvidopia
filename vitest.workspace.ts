import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  {
    test: {
      name: 'unit',
      include: ['platform/**/test/**/*.test.ts', 'services/**/test/**/*.test.ts'],
      exclude: ['**/test/**/*.integration.test.ts'],
      environment: 'node',
    },
  },
  {
    test: {
      name: 'integration',
      include: ['services/**/test/**/*.integration.test.ts'],
      environment: 'node',
      testTimeout: 30_000,
    },
  },
]);
