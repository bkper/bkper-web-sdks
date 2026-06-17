import {
    applyTheme,
    getTheme,
    setTheme,
    subscribeThemeChanges,
    type ThemePreference,
} from './theme/index.js';

export class BkperThemeToggle extends HTMLElement {
    private theme: ThemePreference = 'system';
    private unsubscribeThemeChanges?: () => void;

    connectedCallback(): void {
        this.theme = getTheme();
        applyTheme(this.theme);
        this.render();
        this.unsubscribeThemeChanges = subscribeThemeChanges(change => {
            this.theme = change.theme;
            this.render();
        });
    }

    disconnectedCallback(): void {
        this.unsubscribeThemeChanges?.();
    }

    private toggleTheme = (): void => {
        const themeOrder: ThemePreference[] = ['system', 'dark', 'light'];
        const currentIndex = themeOrder.indexOf(this.theme);
        this.theme = themeOrder[(currentIndex + 1) % themeOrder.length];
        setTheme(this.theme);
    };

    private render(): void {
        this.textContent = '';
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = this.theme;
        button.setAttribute('aria-label', `Theme: ${this.theme}`);
        button.addEventListener('click', this.toggleTheme);
        this.append(button);
    }
}

if (!customElements.get('bkper-theme-toggle')) {
    customElements.define('bkper-theme-toggle', BkperThemeToggle);
}

declare global {
    interface HTMLElementTagNameMap {
        'bkper-theme-toggle': BkperThemeToggle;
    }
}
