import baseConfig from '@croquiscom/eslint-config/requiring-type-checking.mjs';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  ...baseConfig,
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },

      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },

    settings: {
      'import/resolver': {
        typescript: true,
      },
    },

    rules: {
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
      '@typescript-eslint/no-unnecessary-condition': 'off',
      '@typescript-eslint/consistent-type-definitions': 'off',
      'import/order': 'off',
      'import/no-unresolved': 'off',
    },
  },
  {
    ignores: ['eslint.config.mjs', 'build/**', '.docusaurus/**'],
  },
);
