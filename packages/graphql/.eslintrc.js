module.exports = {
  root: true,
  env: {
    node: true,
  },
  extends: ['@croquiscom/eslint-config/requiring-type-checking'],
  parserOptions: {
    project: [`${__dirname}/tsconfig.json`],
  },
  ignorePatterns: ['.eslintrc.js', 'lib/'],
  rules: {
    '@typescript-eslint/no-unsafe-call': 'off',
    '@typescript-eslint/no-unsafe-member-access': 'off',
    '@typescript-eslint/no-unsafe-assignment': 'off',
    '@typescript-eslint/no-unsafe-return': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-floating-promises': 'off',
    '@typescript-eslint/restrict-template-expressions': 'off',
    '@typescript-eslint/restrict-plus-operands': 'off',
    '@typescript-eslint/ban-types': 'off',
  },
};
