import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores(['.next/**', 'out/**', 'build/**', 'coverage/**', 'src/generated/prisma/**', 'next-env.d.ts']),
  {
    files: ['src/domain/**/*.ts', 'src/modules/**/*.validation.ts', 'src/shared/validation/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [{
        group: ['**/*.repository', '**/*.service', '**/shared/db/**', '**/generated/prisma/**', 'next', 'next/**', 'server-only', 'node:*'],
        message: 'Financial calculations and validation must remain portable.',
      }] }],
    },
  },
  {
    files: ['src/modules/**/*.repository.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [{
        group: ['**/*.service'],
        message: 'Repositories own queries and must not call services.',
      }] }],
    },
  },
  {
    files: ['src/modules/**/*.service.ts'],
    ignores: ['src/modules/auth/auth.service.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [{ group: ['next', 'next/**'], message: 'Services own workflows independently of transport.' }] }],
    },
  },
  {
    files: ['src/app/**/*.tsx', 'src/components/**/*.tsx'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [{
        group: ['**/*.repository', '**/shared/db/**', '**/generated/prisma/**'],
        message: 'Call feature services; Prisma access belongs in repositories.',
      }] }],
    },
  },
]);
