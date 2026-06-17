import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import '../src/theme-toggle.js';

function clearThemeCookie(): void {
    document.cookie = 'bkper_theme=; Max-Age=0; Path=/';
}

function getButtonText(element: Element): string | null {
    return element.querySelector('button')?.textContent ?? null;
}

describe('bkper-theme-toggle', () => {
    beforeEach(() => {
        clearThemeCookie();
        localStorage.clear();
        document.documentElement.className = '';
        document.documentElement.style.colorScheme = '';
    });

    afterEach(() => {
        document.body.replaceChildren();
        clearThemeCookie();
    });

    it('applies the current theme when connected', () => {
        const toggle = document.createElement('bkper-theme-toggle');
        document.body.append(toggle);

        expect(getButtonText(toggle)).toBe('dark');
        expect(document.documentElement.classList.contains('wa-dark')).toBe(true);
        expect(document.documentElement.style.colorScheme).toBe('dark');
    });

    it('cycles the selected theme and applies it to the document', () => {
        const toggle = document.createElement('bkper-theme-toggle');
        document.body.append(toggle);

        expect(getButtonText(toggle)).toBe('dark');

        toggle.querySelector('button')?.click();

        expect(getButtonText(toggle)).toBe('light');
        expect(document.cookie).toContain('bkper_theme=light');
        expect(document.documentElement.classList.contains('wa-dark')).toBe(false);
        expect(document.documentElement.style.colorScheme).toBe('light');
    });

    it('keeps multiple toggles synchronized on local theme changes', () => {
        const firstToggle = document.createElement('bkper-theme-toggle');
        const secondToggle = document.createElement('bkper-theme-toggle');
        document.body.append(firstToggle, secondToggle);

        firstToggle.querySelector('button')?.click();

        expect(getButtonText(firstToggle)).toBe('light');
        expect(getButtonText(secondToggle)).toBe('light');
    });
});
