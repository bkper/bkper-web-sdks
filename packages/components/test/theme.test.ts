import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    createThemeChangeMessage,
    DEFAULT_THEME,
    isThemePreference,
    readThemeChangeMessage,
    THEME_CHANGE_MESSAGE_TYPE,
} from '../src/theme/index.js';
import {
    applyTheme,
    getTheme,
    isDarkTheme,
    LEGACY_THEME_STORAGE_KEY,
    resolveTheme,
    setTheme,
    THEME_COOKIE_NAME,
    type ResolvedTheme,
    type ThemeDocument,
    type ThemePreference,
    type ThemeStorage,
} from '../src/theme/runtime.js';

class MemoryStorage implements ThemeStorage {
    private values = new Map<string, string>();

    getItem(key: string): string | null {
        return this.values.get(key) ?? null;
    }

    setItem(key: string, value: string): void {
        this.values.set(key, value);
    }

    removeItem(key: string): void {
        this.values.delete(key);
    }
}

class CookieDocument implements ThemeDocument {
    private value = '';
    public writes: string[] = [];
    public documentElement = document.documentElement;

    get cookie(): string {
        return this.value;
    }

    set cookie(value: string) {
        this.writes.push(value);
        const [cookiePair] = value.split(';');
        const [name, cookieValue] = cookiePair.split('=');
        const cookies = new Map(
            this.value
                .split('; ')
                .filter(Boolean)
                .map(cookie => cookie.split('=') as [string, string])
        );
        cookies.set(name, cookieValue);
        this.value = Array.from(cookies.entries())
            .map(([cookieName, storedValue]) => `${cookieName}=${storedValue}`)
            .join('; ');
    }
}

function matchMediaWith(matches: boolean): (query: string) => MediaQueryList {
    return () => ({
        matches,
        media: '(prefers-color-scheme: dark)',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    });
}

function createRuntime(options?: {
    cookie?: string;
    storage?: MemoryStorage;
    systemDark?: boolean;
    hostname?: string;
    protocol?: string;
}): {
    doc: CookieDocument;
    storage: MemoryStorage;
    runtime: {
        document: CookieDocument;
        storage: MemoryStorage;
        location: { hostname: string; protocol: string };
        matchMedia: (query: string) => MediaQueryList;
    };
} {
    const doc = new CookieDocument();
    if (options?.cookie) {
        doc.cookie = options.cookie;
        doc.writes = [];
    }
    const storage = options?.storage ?? new MemoryStorage();
    return {
        doc,
        storage,
        runtime: {
            document: doc,
            storage,
            location: {
                hostname: options?.hostname ?? 'localhost',
                protocol: options?.protocol ?? 'http:',
            },
            matchMedia: matchMediaWith(options?.systemDark ?? false),
        },
    };
}

describe('theme helpers', () => {
    beforeEach(() => {
        document.documentElement.className = '';
        document.documentElement.style.colorScheme = '';
    });

    it('recognizes only supported theme preferences', () => {
        expect(isThemePreference('system')).toBe(true);
        expect(isThemePreference('dark')).toBe(true);
        expect(isThemePreference('light')).toBe(true);
        expect(isThemePreference('auto')).toBe(false);
    });

    it('defaults to dark when no cookie or legacy storage exists', () => {
        const { runtime } = createRuntime();

        expect(getTheme(runtime)).toBe(DEFAULT_THEME);
    });

    it('reads the canonical cookie before legacy storage', () => {
        const storage = new MemoryStorage();
        storage.setItem(LEGACY_THEME_STORAGE_KEY, 'dark');
        const { runtime } = createRuntime({ cookie: `${THEME_COOKIE_NAME}=light`, storage });

        expect(getTheme(runtime)).toBe('light');
    });

    it('migrates a valid legacy localStorage theme when the cookie is missing', () => {
        const storage = new MemoryStorage();
        storage.setItem(LEGACY_THEME_STORAGE_KEY, 'system');
        const { doc, runtime } = createRuntime({
            storage,
            hostname: 'bkper.app',
            protocol: 'https:',
        });

        expect(getTheme(runtime)).toBe('system');
        expect(storage.getItem(LEGACY_THEME_STORAGE_KEY)).toBeNull();
        expect(doc.writes[0]).toContain(`${THEME_COOKIE_NAME}=system`);
        expect(doc.writes[0]).toContain('Domain=.bkper.app');
        expect(doc.writes[0]).toContain('Secure');
    });

    it('stores the canonical cookie and clears legacy localStorage', () => {
        const storage = new MemoryStorage();
        storage.setItem(LEGACY_THEME_STORAGE_KEY, 'dark');
        const { doc, runtime } = createRuntime({ storage });

        setTheme('light', runtime);

        expect(storage.getItem(LEGACY_THEME_STORAGE_KEY)).toBeNull();
        expect(doc.writes[0]).toContain(`${THEME_COOKIE_NAME}=light`);
        expect(doc.writes[0]).toContain('Path=/');
        expect(doc.writes[0]).toContain('Max-Age=31536000');
        expect(doc.writes[0]).toContain('SameSite=Lax');
        expect(doc.writes[0]).not.toContain('Domain=');
        expect(doc.writes[0]).not.toContain('Secure');
    });

    it('resolves system using prefers-color-scheme', () => {
        expect(resolveTheme('system', createRuntime({ systemDark: true }).runtime)).toBe('dark');
        expect(resolveTheme('system', createRuntime({ systemDark: false }).runtime)).toBe('light');
    });

    it('reports whether the resolved theme is dark', () => {
        expect(isDarkTheme('dark', createRuntime().runtime)).toBe(true);
        expect(isDarkTheme('light', createRuntime().runtime)).toBe(false);
        expect(isDarkTheme('system', createRuntime({ systemDark: true }).runtime)).toBe(true);
    });

    it('applies wa-dark and color-scheme to the document element', () => {
        const { runtime } = createRuntime();

        const resolvedTheme: ResolvedTheme = applyTheme('dark', runtime);

        expect(resolvedTheme).toBe('dark');
        expect(document.documentElement.classList.contains('wa-dark')).toBe(true);
        expect(document.documentElement.style.colorScheme).toBe('dark');

        applyTheme('light', runtime);

        expect(document.documentElement.classList.contains('wa-dark')).toBe(false);
        expect(document.documentElement.style.colorScheme).toBe('light');
    });

    it('creates and reads theme change messages', () => {
        const message = createThemeChangeMessage('light');

        expect(message).toEqual({
            type: THEME_CHANGE_MESSAGE_TYPE,
            theme: 'light' satisfies ThemePreference,
        });
        expect(readThemeChangeMessage(message)).toBe('light');
        expect(readThemeChangeMessage({ type: THEME_CHANGE_MESSAGE_TYPE, theme: 'auto' })).toBe(
            undefined
        );
        expect(readThemeChangeMessage({ type: 'other', theme: 'light' })).toBe(undefined);
    });
});
