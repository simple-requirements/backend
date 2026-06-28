import { includeIgnoreFile } from '@eslint/config-helpers';
import js from '@eslint/js';
import type { ESLint } from 'eslint';
import { defineConfig } from 'eslint/config';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import { fileURLToPath } from 'node:url';
import tseslint from 'typescript-eslint';

const configDirectory = fileURLToPath(new URL('.', import.meta.url));
const gitignorePath = fileURLToPath(new URL('.gitignore', import.meta.url));

const reactHooksPlugin = { meta: reactHooks.meta, rules: reactHooks.rules } satisfies ESLint.Plugin;

const reactRefreshPlugin = { rules: reactRefresh.rules } satisfies ESLint.Plugin;

const reactHooksRecommendedRules = reactHooks.configs.recommended.rules;

export default defineConfig(
    includeIgnoreFile(gitignorePath),
    { ignores: ['test/e2e/**'] },

    js.configs.recommended,

    ...tseslint.configs.strictTypeChecked,
    ...tseslint.configs.stylisticTypeChecked,

    prettier,

    {
        files: ['test/*.spec.ts'],
        rules: {
            '@typescript-eslint/no-unsafe-assignment': 'off',
            '@typescript-eslint/no-unsafe-call': 'off',
            '@typescript-eslint/no-unsafe-member-access': 'off',
            '@typescript-eslint/no-unsafe-return': 'off',
            '@typescript-eslint/no-unsafe-argument': 'off',
        },
    },

    {
        files: ['eslint.config.mts'],
        rules: {
            '@typescript-eslint/no-unsafe-assignment': 'off',
            '@typescript-eslint/no-unsafe-member-access': 'off',
        },
    },

    {
        languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: configDirectory } },
        rules: {
            '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
            '@typescript-eslint/no-confusing-void-expression': 'off',
            '@typescript-eslint/no-empty-function': 'off',
        },
    },

    {
        files: ['electron.vite.config.ts', 'playwright.config.ts', 'src/main/**/*.ts', 'src/preload/**/*.ts'],
        languageOptions: { globals: { __dirname: 'readonly', process: 'readonly' } },
    },

    {
        files: ['src/renderer/**/*.{ts,tsx}'],
        plugins: { 'react-hooks': reactHooksPlugin, 'react-refresh': reactRefreshPlugin },
        languageOptions: { globals: { document: 'readonly', window: 'readonly' } },
        rules: {
            ...reactHooksRecommendedRules,
            'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
        },
    },
);
