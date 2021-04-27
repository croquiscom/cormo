module.exports = {
  root: true,
  env: {
    node: true,
    es6: true,
  },
  extends: ['@croquiscom'],
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  rules: {
    '@typescript-eslint/no-var-requires': 'off',
  },
};
