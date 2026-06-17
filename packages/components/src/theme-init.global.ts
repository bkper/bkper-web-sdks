(function () {
    type ThemePreference = 'system' | 'dark' | 'light';

    type ThemeMessage = {
        type?: unknown;
        theme?: unknown;
    };

    const THEME_COOKIE = 'bkper_theme';
    const LEGACY_THEME_KEY = 'theme';
    const THEME_MESSAGE = 'bkper:theme-changed';
    const DARK_MEDIA_QUERY = '(prefers-color-scheme: dark)';

    function isTheme(value: unknown): value is ThemePreference {
        return value === 'system' || value === 'dark' || value === 'light';
    }

    function getCookie(name: string): string | null {
        const cookies = document.cookie ? document.cookie.split(';') : [];
        for (let i = 0; i < cookies.length; i++) {
            const parts = cookies[i].trim().split('=');
            const cookieName = parts.shift();
            if (cookieName === name) {
                const rawValue = parts.join('=');
                try {
                    return decodeURIComponent(rawValue);
                } catch {
                    return rawValue;
                }
            }
        }
        return null;
    }

    function writeCookie(theme: ThemePreference): void {
        const attributes = ['Path=/', 'Max-Age=31536000', 'SameSite=Lax'];
        const hostname = location.hostname.toLowerCase();
        if (hostname === 'bkper.app' || hostname.endsWith('.bkper.app')) {
            attributes.push('Domain=.bkper.app');
        }
        if (location.protocol === 'https:') {
            attributes.push('Secure');
        }
        document.cookie = `${THEME_COOKIE}=${encodeURIComponent(theme)}; ${attributes.join('; ')}`;
    }

    function getLegacyTheme(): ThemePreference | null {
        try {
            const theme = localStorage.getItem(LEGACY_THEME_KEY);
            return isTheme(theme) ? theme : null;
        } catch {
            return null;
        }
    }

    function removeLegacyTheme(): void {
        try {
            localStorage.removeItem(LEGACY_THEME_KEY);
        } catch {
            // Ignore unavailable storage.
        }
    }

    function storeTheme(theme: ThemePreference): void {
        writeCookie(theme);
        removeLegacyTheme();
    }

    function getTheme(): ThemePreference {
        const theme = getCookie(THEME_COOKIE);
        if (isTheme(theme)) {
            return theme;
        }

        const legacyTheme = getLegacyTheme();
        removeLegacyTheme();
        if (legacyTheme) {
            writeCookie(legacyTheme);
            return legacyTheme;
        }

        return 'dark';
    }

    function isSystemDark(): boolean {
        return Boolean(window.matchMedia && window.matchMedia(DARK_MEDIA_QUERY).matches);
    }

    function resolveTheme(theme: ThemePreference): 'dark' | 'light' {
        if (theme === 'system') {
            return isSystemDark() ? 'dark' : 'light';
        }
        return theme;
    }

    function applyTheme(theme: ThemePreference): void {
        const resolvedTheme = resolveTheme(theme);
        const html = document.documentElement;
        html.classList.toggle('wa-dark', resolvedTheme === 'dark');
        html.style.colorScheme = resolvedTheme;
    }

    applyTheme(getTheme());

    if (window.matchMedia) {
        const mediaQueryList = window.matchMedia(DARK_MEDIA_QUERY);
        const systemThemeChanged = function (): void {
            const theme = getTheme();
            if (theme === 'system') {
                applyTheme(theme);
            }
        };

        if (mediaQueryList.addEventListener) {
            mediaQueryList.addEventListener('change', systemThemeChanged);
        } else if (mediaQueryList.addListener) {
            mediaQueryList.addListener(systemThemeChanged);
        }
    }

    window.addEventListener('message', function (event: MessageEvent): void {
        if (
            !event.source ||
            event.source === window ||
            (event.source !== window.parent && event.source !== window.opener)
        ) {
            return;
        }

        const data = event.data as ThemeMessage | null;
        if (!data || data.type !== THEME_MESSAGE || !isTheme(data.theme)) {
            return;
        }

        if (getTheme() !== data.theme) {
            storeTheme(data.theme);
        }
        applyTheme(data.theme);
    });
})();
