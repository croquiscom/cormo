module.exports = {
  root: true,
  env: {
    node: true,
  },
  extends: [
    '@croquiscom/eslint-config/requiring-type-checking',
  ],
  parserOptions: {
    project: [
      `${__dirname}/tsconfig.json`,
    ],
  },
  ignorePatterns: [
    'lib/',
  ],
};
