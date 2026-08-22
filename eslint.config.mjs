import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/node_modules/**',
      'server/prisma/migrations/**',
      'client/src/vite-env.d.ts',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'smart'],
    },
  },

  // Shared workspace
  {
    files: ['shared/**/*.ts'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },

  // Server workspace
  {
    files: ['server/**/*.ts'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },

  // Client workspace
  {
    files: ['client/**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    languageOptions: {
      globals: { ...globals.browser },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },

  // Config files run in Node
  {
    files: ['**/*.config.{js,mjs,ts}', 'eslint.config.mjs'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },

  // Maintenance scripts and the seed are Node CLIs; printing progress to stdout
  // is their whole job.
  {
    files: [
      'scripts/**/*.{js,mjs,ts}',
      'server/scripts/**/*.{js,mjs,ts}',
      'server/prisma/**/*.ts',
    ],
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      'no-console': 'off',
    },
  },

  // Route modules export a router, not components, so they are not HMR boundaries.
  {
    files: ['client/src/routes/**/*.{ts,tsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },

  // Tests
  {
    files: ['**/*.test.{ts,tsx}', '**/test/**/*.{ts,tsx}', '**/__tests__/**/*.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
    rules: {
      'no-console': 'off',
      'react-refresh/only-export-components': 'off',
    },
  },

  prettier,
);
