import { describe, expect, it, vi } from 'vitest';

describe('package entrypoints', () => {
    it('imports the root entrypoint without browser custom element globals', async () => {
        vi.resetModules();
        vi.stubGlobal('HTMLElement', undefined);
        vi.stubGlobal('customElements', undefined);

        try {
            await expect(
                import('../src/index.js?entrypoint-no-custom-elements')
            ).resolves.toBeDefined();
        } finally {
            vi.unstubAllGlobals();
        }
    });
});
