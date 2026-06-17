export type ThemePreference = 'system' | 'dark' | 'light';
export type ResolvedTheme = 'dark' | 'light';

export interface ThemeChange {
    theme: ThemePreference;
    resolvedTheme: ResolvedTheme;
}

export interface ThemeStorage {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
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

export interface ThemeWindow {
    addEventListener(type: 'message', listener: (event: MessageEvent) => void): void;
    removeEventListener(type: 'message', listener: (event: MessageEvent) => void): void;
    parent: MessageEventSource | null;
    opener: MessageEventSource | null;
}

export interface ThemeRuntime {
    document?: ThemeDocument;
    storage?: ThemeStorage;
    location?: ThemeLocation;
    matchMedia?: (query: string) => MediaQueryList;
    window?: ThemeWindow;
}

export type ThemeChangeListener = (change: ThemeChange) => void;

export const THEME_COOKIE_NAME = 'bkper_theme';
export const LEGACY_THEME_STORAGE_KEY = 'theme';
export const DEFAULT_THEME: ThemePreference = 'dark';
export const THEME_CHANGE_MESSAGE_TYPE = 'bkper:theme-changed';

const DARK_MEDIA_QUERY = '(prefers-color-scheme: dark)';
const THEME_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
const localThemeChangeListeners = new Set<(theme: ThemePreference) => void>();

export function isThemePreference(value: string | null | undefined): value is ThemePreference {
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
    persistTheme(theme, runtime);
    notifyLocalThemeChange(theme);
}

export function resolveTheme(theme?: ThemePreference, runtime: ThemeRuntime = {}): ResolvedTheme {
    const selectedTheme = theme ?? getTheme(runtime);
    if (selectedTheme === 'system') {
        return isSystemDark(runtime) ? 'dark' : 'light';
    }
    return selectedTheme;
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

export function subscribeThemeChanges(
    listener: ThemeChangeListener,
    runtime: ThemeRuntime = {}
): () => void {
    const win = getRuntimeWindow(runtime);
    const mediaQueryList = getRuntimeMatchMedia(runtime)?.(DARK_MEDIA_QUERY);

    const notify = (theme: ThemePreference): void => {
        listener({ theme, resolvedTheme: applyTheme(theme, runtime) });
    };

    const mediaQueryHandler = (): void => {
        const theme = getTheme(runtime);
        if (theme === 'system') {
            notify(theme);
        }
    };

    const messageHandler = (event: MessageEvent): void => {
        if (!win || !isAllowedThemeMessageSource(event, win)) {
            return;
        }

        const theme = readThemeChangeMessage(event.data);
        if (!theme) {
            return;
        }

        if (getTheme(runtime) !== theme) {
            persistTheme(theme, runtime);
        }

        notify(theme);
    };

    const localThemeChangeHandler = (theme: ThemePreference): void => notify(theme);
    const removeMediaQueryListener = addMediaQueryChangeListener(mediaQueryList, mediaQueryHandler);
    localThemeChangeListeners.add(localThemeChangeHandler);
    win?.addEventListener('message', messageHandler);

    return () => {
        removeMediaQueryListener();
        localThemeChangeListeners.delete(localThemeChangeHandler);
        win?.removeEventListener('message', messageHandler);
    };
}

export function initializeTheme(runtime: ThemeRuntime = {}): () => void {
    applyTheme(getTheme(runtime), runtime);
    return subscribeThemeChanges(() => undefined, runtime);
}

function persistTheme(theme: ThemePreference, runtime: ThemeRuntime): void {
    writeThemeCookie(theme, runtime);
    removeLegacyTheme(getRuntimeStorage(runtime));
}

function notifyLocalThemeChange(theme: ThemePreference): void {
    for (const listener of Array.from(localThemeChangeListeners)) {
        listener(theme);
    }
}

function addMediaQueryChangeListener(
    mediaQueryList: MediaQueryList | undefined,
    listener: () => void
): () => void {
    if (!mediaQueryList) {
        return () => undefined;
    }

    if (typeof mediaQueryList.addEventListener === 'function') {
        mediaQueryList.addEventListener('change', listener);
        return () => mediaQueryList.removeEventListener('change', listener);
    }

    mediaQueryList.addListener(listener);
    return () => mediaQueryList.removeListener(listener);
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

function readThemeChangeMessage(data: unknown): ThemePreference | undefined {
    if (typeof data !== 'object' || data === null) {
        return undefined;
    }

    const candidate = data as { type?: unknown; theme?: unknown };
    if (candidate.type !== THEME_CHANGE_MESSAGE_TYPE || typeof candidate.theme !== 'string') {
        return undefined;
    }

    return isThemePreference(candidate.theme) ? candidate.theme : undefined;
}

function isAllowedThemeMessageSource(event: MessageEvent, win: ThemeWindow): boolean {
    const source = event.source;
    if (!source || source === win) {
        return false;
    }

    return source === win.parent || source === win.opener;
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

function getRuntimeWindow(runtime: ThemeRuntime): ThemeWindow | undefined {
    if (runtime.window) {
        return runtime.window;
    }
    if (typeof window === 'undefined') {
        return undefined;
    }
    return window;
}
