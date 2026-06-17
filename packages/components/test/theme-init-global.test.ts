import { beforeEach, describe, expect, it } from 'vitest';

async function runThemeInitGlobal(): Promise<void> {
    await import('../src/theme-init.global.ts?theme-init-global-test');
}

describe('theme-init.global', () => {
    beforeEach(() => {
        document.cookie = 'bkper_theme=; Max-Age=0; Path=/';
        localStorage.clear();
        document.documentElement.className = '';
        document.documentElement.style.colorScheme = '';
    });

    it('runs before app modules and migrates legacy storage before first paint', async () => {
        localStorage.setItem('theme', 'light');

        await runThemeInitGlobal();

        expect(document.cookie).toContain('bkper_theme=light');
        expect(localStorage.getItem('theme')).toBeNull();
        expect(document.documentElement.classList.contains('wa-dark')).toBe(false);
        expect(document.documentElement.style.colorScheme).toBe('light');
    });
});
