import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import nx from '@nx/eslint-plugin';

export default defineConfig([
  globalIgnores(['dist/**', 'node_modules/**', 'coverage/**']),
  {
    files: ['apps/web/**/*.{ts,tsx,js,jsx}', 'libs/frontend/**/*.{ts,tsx}', 'libs/domains/commerce/storefront/ui/src/**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended, reactHooks.configs.flat.recommended],
    plugins: {
      'react-refresh': reactRefresh,
    },
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        console: 'readonly',
        document: 'readonly',
        localStorage: 'readonly',
        MutationObserver: 'readonly',
        window: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  {
    files: ['apps/api/**/*.ts', 'apps/services/vision-service/**/*.ts', 'apps/workers/**/*.ts', 'apps/automation/**/*.js', 'libs/**/*.ts'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['apps/**/*.{ts,tsx}', 'libs/**/*.{ts,tsx}'],
    plugins: { '@nx': nx },
    rules: {
      '@nx/enforce-module-boundaries': ['error', {
        enforceBuildableLibDependency: false,
        allowCircularSelfDependency: false,
        depConstraints: [
          { sourceTag: 'platform:frontend', onlyDependOnLibsWithTags: ['platform:frontend', 'platform:isomorphic'] },
          { sourceTag: 'platform:backend', onlyDependOnLibsWithTags: ['platform:backend', 'platform:isomorphic'] },
          { sourceTag: 'platform:worker', onlyDependOnLibsWithTags: ['platform:backend', 'platform:isomorphic'] },
          { sourceTag: 'platform:isomorphic', onlyDependOnLibsWithTags: ['platform:isomorphic'] },
          { sourceTag: 'type:contracts', onlyDependOnLibsWithTags: ['type:contracts', 'type:util'] },
          { sourceTag: 'type:data-access', onlyDependOnLibsWithTags: ['type:data-access', 'type:contracts', 'type:util'] },
          { sourceTag: 'type:application', onlyDependOnLibsWithTags: ['type:application', 'type:domain', 'type:contracts', 'type:infrastructure', 'type:data-access'] },
          { sourceTag: 'scope:shared', onlyDependOnLibsWithTags: ['scope:shared'] },
          { sourceTag: 'scope:commerce', onlyDependOnLibsWithTags: ['scope:commerce', 'scope:shared'] },
          { sourceTag: 'scope:jobs', onlyDependOnLibsWithTags: ['scope:jobs', 'scope:shared'] },
          { sourceTag: 'scope:erp', onlyDependOnLibsWithTags: ['scope:erp', 'scope:commerce', 'scope:jobs', 'scope:shared'] },
          { sourceTag: 'scope:retail', onlyDependOnLibsWithTags: ['scope:retail', 'scope:shared'] }
        ]
      }]
    }
  },
]);
