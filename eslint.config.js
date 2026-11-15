// Lint: catches mistakes that the build lets through (a method declared twice, a name that does not exist,
// a missing import). Style is not checked. Run `npm run lint` before pushing.
import js from '@eslint/js';
import globals from 'globals';

const rules = {
  'no-unused-vars': ['warn', { args: 'none', caughtErrors: 'none', varsIgnorePattern: '^_' }], // leftovers: worth a look, not a bug
  'no-empty': ['error', { allowEmptyCatch: true }],
};

export default [
  { ignores: ['dist/**', 'node_modules/**'] },
  js.configs.recommended,
  {
    files: ['src/**/*.js'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: { ...globals.browser } },
    rules,
  },
  {
    files: ['tools/**/*.{js,mjs}', '*.config.js'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: { ...globals.node } },
    rules,
  },
];
