const { resolve } = require('node:path');

const project = resolve(__dirname, 'tsconfig.json');

/** @type {import("eslint").Linter.Config} */
const config = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'import'],
  extends: [
    'turbo',
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended-type-checked',
    'plugin:@typescript-eslint/stylistic-type-checked',
    'prettier',
    'eslint-config-turbo'
  ],
  parserOptions: {
    project,
    tsconfigRootDir: __dirname
  },
  settings: {
    'import/resolver': {
      typescript: {
        project,
        tsconfigRootDir: __dirname
      }
    }
  },
  rules: {
    '@typescript-eslint/no-unsafe-return': 'off',
    '@typescript-eslint/consistent-type-definitions': 'off',
    '@typescript-eslint/prefer-nullish-coalescing': 'off',
    '@typescript-eslint/no-unsafe-member-access': 'off',
    '@typescript-eslint/no-unsafe-argument': 'off',
    '@typescript-eslint/no-unsafe-assignment': 'off',
    '@typescript-eslint/no-unsafe-call': 'off',
    'typescript-eslint/no-redundant-type-constituents': 'off',
    '@typescript-eslint/no-empty-interface': 'off',
    '@typescript-eslint/no-misused-promises': 'off',
    '@typescript-eslint/no-redundant-type-constituents': 'off',
    '@typescript-eslint/no-unused-vars': 'off'
  },
  ignorePatterns: [
    'node_modules/',
    'dist/',
    '**/.eslintrc.js',
    '**/*.config.js',
    'packages/config/**',
    '.next',
    'pnpm-lock.yaml'
  ]
};

module.exports = config;
