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
            exclude: [
                'src/main.ts',
                'src/**/*.module.ts',
                'src/**/*.controller.ts',
                'src/**/*.spec.ts',
                'src/**/*.e2e-spec.ts',
                'src/**/*.entity.ts',
                'src/**/dto/**/*.ts',
                'src/**/*.enum.ts',
                'src/database/**/*.ts',
            ],
        },
    },
});
