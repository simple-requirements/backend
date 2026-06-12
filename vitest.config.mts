import { fileURLToPath } from 'node:url';

import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    plugins: [swc.vite({ module: { type: 'es6' } })],

    oxc: false,

    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },

    test: {
        environment: 'node',
        globals: true,
        include: ['src/**/*.spec.ts'],

        coverage: {
            provider: 'istanbul',
            reporter: ['text', 'html', 'lcov'],
            include: ['src/**/*.ts'],
            exclude: ['src/main.ts', 'src/**/*.module.ts', 'src/**/*.spec.ts'],
        },
    },
});
