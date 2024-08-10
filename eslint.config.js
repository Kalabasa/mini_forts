// @ts-check

const path = require('path');
const tseslint = require('typescript-eslint');
const { noNilElementsRule } = require('./eslint/no-nil-elements');

module.exports = tseslint.config({
  extends: [tseslint.configs.base],
  plugins: { tstl: { rules: { 'no-nil-elements': noNilElementsRule } } },
  rules: {
    // Avoid mixing up falsy concepts in Lua
    '@typescript-eslint/strict-boolean-expressions': [
      'error',
      { allowNullableObject: true },
    ],
    'tstl/no-nil-elements': ['error'],
  },
  ignores: ['eslint.config.js'],
  languageOptions: {
    parserOptions: {
      project: true,
      tsconfigRootDir: path.join(__dirname, 'src'),
    },
  },
});
