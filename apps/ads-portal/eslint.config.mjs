import { defineConfig } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  {
    ignores: ['*.config.mjs', '.next/**', 'out/**', 'build/**', 'next-env.d.ts', 'public/**/*.js'],
  },
  ...nextVitals,
  ...nextTs,
  {
    settings: {
      react: {
        version: '19.0.0',
      },
    },
    rules: {
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/exhaustive-deps': 'off',
      'prefer-const': 'off',
      'react/no-unescaped-entities': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
]);

export default eslintConfig;
