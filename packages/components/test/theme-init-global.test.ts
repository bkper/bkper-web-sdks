import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';

function runThemeInitGlobal(): void {
    const script = readFileSync(join(process.cwd(), 'src/theme-init.global.js'), 'utf8');
    window.eval(script);
}

describe('theme-init.global', () => {
    beforeEach(() => {
        document.cookie = 'bkper_theme=; Max-Age=0; Path=/';
        localStorage.clear();
        document.documentElement.className = '';
        document.documentElement.style.colorScheme = '';
    });

    it('runs as a blocking classic script and migrates legacy storage before first paint', () => {
        localStorage.setItem('theme', 'light');

        runThemeInitGlobal();

        expect(document.cookie).toContain('bkper_theme=light');
        expect(localStorage.getItem('theme')).toBeNull();
        expect(document.documentElement.classList.contains('wa-dark')).toBe(false);
        expect(document.documentElement.style.colorScheme).toBe('light');
    });
});
