// @ts-check

const path = require('path');
const eslint = require('@eslint/js');
const tseslint = require('typescript-eslint');

module.exports = tseslint.config({
  extends: [tseslint.configs.base],
  rules: {
    // Avoid mixing up falsy concepts in Lua
    '@typescript-eslint/strict-boolean-expressions': [
      'error',
      { allowNullableObject: true },
    ],
  },
  ignores: ['eslint.config.js'],
  languageOptions: {
    parserOptions: {
      project: true,
      tsconfigRootDir: path.join(__dirname, 'src'),
    },
  },
});
