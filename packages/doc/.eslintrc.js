module.exports = {
  root: true,
  env: {
    node: true,
  },
  extends: ['@croquiscom/eslint-config/requiring-type-checking'],
  parserOptions: {
    project: [`${__dirname}/tsconfig.json`],
  },
  ignorePatterns: ['.eslintrc.js', 'babel.config.js'],
  rules: {
    '@typescript-eslint/prefer-nullish-coalescing': 'off',
    '@typescript-eslint/no-unnecessary-condition': 'off',
    '@typescript-eslint/consistent-type-definitions': 'off',
    'import/order': 'off',
    'import/no-unresolved': 'off',
  },
};
