export type ThemePreference = 'system' | 'dark' | 'light';
export type ResolvedTheme = 'dark' | 'light';

export interface ThemeChangeMessage {
    type: typeof THEME_CHANGE_MESSAGE_TYPE;
    theme: ThemePreference;
}

export interface ThemeStorage {
    getItem(key: string): string | null;
    removeItem(key: string): void;
}

export interface ThemeDocumentElement {
    classList: Pick<DOMTokenList, 'toggle'>;
    style: Pick<CSSStyleDeclaration, 'colorScheme'>;
}

export interface ThemeDocument {
    cookie: string;
    documentElement: ThemeDocumentElement;
}

export interface ThemeLocation {
    hostname: string;
    protocol: string;
}

export interface ThemeRuntime {
    document?: ThemeDocument;
    storage?: ThemeStorage;
    location?: ThemeLocation;
    matchMedia?: (query: string) => MediaQueryList;
}

export const THEME_COOKIE_NAME = 'bkper_theme';
export const LEGACY_THEME_STORAGE_KEY = 'theme';
export const DEFAULT_THEME: ThemePreference = 'dark';
export const THEME_CHANGE_MESSAGE_TYPE = 'bkper:theme-changed';

const DARK_MEDIA_QUERY = '(prefers-color-scheme: dark)';
const THEME_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export function isThemePreference(value: unknown): value is ThemePreference {
    return value === 'system' || value === 'dark' || value === 'light';
}

export function getTheme(runtime: ThemeRuntime = {}): ThemePreference {
    const cookieTheme = getCookieTheme(runtime);
    if (cookieTheme) {
        return cookieTheme;
    }

    const storage = getRuntimeStorage(runtime);
    const legacyTheme = getLegacyTheme(storage);
    removeLegacyTheme(storage);

    if (legacyTheme) {
        writeThemeCookie(legacyTheme, runtime);
        return legacyTheme;
    }

    return DEFAULT_THEME;
}

export function setTheme(theme: ThemePreference, runtime: ThemeRuntime = {}): void {
    writeThemeCookie(theme, runtime);
    removeLegacyTheme(getRuntimeStorage(runtime));
}

export function resolveTheme(theme?: ThemePreference, runtime: ThemeRuntime = {}): ResolvedTheme {
    const selectedTheme = theme ?? getTheme(runtime);
    if (selectedTheme === 'system') {
        return isSystemDark(runtime) ? 'dark' : 'light';
    }
    return selectedTheme;
}

export function isDarkTheme(theme?: ThemePreference, runtime: ThemeRuntime = {}): boolean {
    return resolveTheme(theme, runtime) === 'dark';
}

export function applyTheme(theme?: ThemePreference, runtime: ThemeRuntime = {}): ResolvedTheme {
    const resolvedTheme = resolveTheme(theme, runtime);
    const doc = getRuntimeDocument(runtime);

    if (doc) {
        doc.documentElement.classList.toggle('wa-dark', resolvedTheme === 'dark');
        doc.documentElement.style.colorScheme = resolvedTheme;
    }

    return resolvedTheme;
}

export function createThemeChangeMessage(theme: ThemePreference): ThemeChangeMessage {
    return { type: THEME_CHANGE_MESSAGE_TYPE, theme };
}

export function readThemeChangeMessage(data: unknown): ThemePreference | undefined {
    if (typeof data !== 'object' || data === null) {
        return undefined;
    }

    const candidate = data as { type?: unknown; theme?: unknown };
    if (candidate.type !== THEME_CHANGE_MESSAGE_TYPE) {
        return undefined;
    }

    return isThemePreference(candidate.theme) ? candidate.theme : undefined;
}

function getCookieTheme(runtime: ThemeRuntime): ThemePreference | undefined {
    const value = getCookieValue(runtime, THEME_COOKIE_NAME);
    return isThemePreference(value) ? value : undefined;
}

function getLegacyTheme(storage: ThemeStorage | undefined): ThemePreference | undefined {
    if (!storage) {
        return undefined;
    }

    try {
        const value = storage.getItem(LEGACY_THEME_STORAGE_KEY);
        return isThemePreference(value) ? value : undefined;
    } catch {
        return undefined;
    }
}

function removeLegacyTheme(storage: ThemeStorage | undefined): void {
    if (!storage) {
        return;
    }

    try {
        storage.removeItem(LEGACY_THEME_STORAGE_KEY);
    } catch {
        // Ignore unavailable storage.
    }
}

function getCookieValue(runtime: ThemeRuntime, name: string): string | undefined {
    const doc = getRuntimeDocument(runtime);
    if (!doc?.cookie) {
        return undefined;
    }

    const cookies = doc.cookie.split(';');
    for (const cookie of cookies) {
        const [rawName, ...rawValueParts] = cookie.trim().split('=');
        if (rawName === name) {
            const rawValue = rawValueParts.join('=');
            try {
                return decodeURIComponent(rawValue);
            } catch {
                return rawValue;
            }
        }
    }

    return undefined;
}

function writeThemeCookie(theme: ThemePreference, runtime: ThemeRuntime): void {
    const doc = getRuntimeDocument(runtime);
    if (!doc) {
        return;
    }

    doc.cookie = [
        `${THEME_COOKIE_NAME}=${encodeURIComponent(theme)}`,
        'Path=/',
        `Max-Age=${THEME_COOKIE_MAX_AGE_SECONDS}`,
        'SameSite=Lax',
        getCookieDomainAttribute(runtime),
        getCookieSecureAttribute(runtime),
    ]
        .filter(Boolean)
        .join('; ');
}

function getCookieDomainAttribute(runtime: ThemeRuntime): string {
    const hostname = getRuntimeLocation(runtime)?.hostname.toLowerCase();
    if (hostname === 'bkper.app' || hostname?.endsWith('.bkper.app')) {
        return 'Domain=.bkper.app';
    }
    return '';
}

function getCookieSecureAttribute(runtime: ThemeRuntime): string {
    return getRuntimeLocation(runtime)?.protocol === 'https:' ? 'Secure' : '';
}

function isSystemDark(runtime: ThemeRuntime): boolean {
    return getRuntimeMatchMedia(runtime)?.(DARK_MEDIA_QUERY).matches ?? false;
}

function getRuntimeDocument(runtime: ThemeRuntime): ThemeDocument | undefined {
    if (runtime.document) {
        return runtime.document;
    }
    if (typeof document === 'undefined') {
        return undefined;
    }
    return document;
}

function getRuntimeStorage(runtime: ThemeRuntime): ThemeStorage | undefined {
    if (runtime.storage) {
        return runtime.storage;
    }

    try {
        if (typeof localStorage === 'undefined') {
            return undefined;
        }
        return localStorage;
    } catch {
        return undefined;
    }
}

function getRuntimeLocation(runtime: ThemeRuntime): ThemeLocation | undefined {
    if (runtime.location) {
        return runtime.location;
    }
    if (typeof location === 'undefined') {
        return undefined;
    }
    return location;
}

function getRuntimeMatchMedia(
    runtime: ThemeRuntime
): ((query: string) => MediaQueryList) | undefined {
    if (runtime.matchMedia) {
        return runtime.matchMedia;
    }
    if (typeof matchMedia === 'undefined') {
        return undefined;
    }
    return query => matchMedia(query);
}
