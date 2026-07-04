import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import { fileURLToPath } from 'node:url';
import tseslint from 'typescript-eslint';

const configDirectory = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig(
    {
        ignores: ['coverage/**', 'dist/**', 'playwright-report/**', 'test-results/**'],
    },

    js.configs.recommended,

    ...tseslint.configs.strictTypeChecked,
    ...tseslint.configs.stylisticTypeChecked,

    prettier,

    {
        files: ['**/*.ts', '**/*.mts'],
        languageOptions: {
            globals: globals.node,
            parserOptions: { projectService: true, tsconfigRootDir: configDirectory },
        },
        rules: {
            '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
            '@typescript-eslint/no-confusing-void-expression': 'off',
            '@typescript-eslint/no-empty-function': 'off',
        },
    },

    {
        files: ['src/**/*.spec.ts', 'src/**/*.e2e-spec.ts'],
        rules: {
            '@typescript-eslint/no-unsafe-assignment': 'off',
            '@typescript-eslint/no-unsafe-call': 'off',
            '@typescript-eslint/no-unsafe-member-access': 'off',
            '@typescript-eslint/no-unsafe-return': 'off',
            '@typescript-eslint/no-unsafe-argument': 'off',
        },
    },
);
