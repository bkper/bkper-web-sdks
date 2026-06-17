(function () {
    var THEME_COOKIE = 'bkper_theme';
    var LEGACY_THEME_KEY = 'theme';
    var THEME_MESSAGE = 'bkper:theme-changed';
    var DARK_MEDIA_QUERY = '(prefers-color-scheme: dark)';

    function isTheme(value) {
        return value === 'system' || value === 'dark' || value === 'light';
    }

    function getCookie(name) {
        var cookies = document.cookie ? document.cookie.split(';') : [];
        for (var i = 0; i < cookies.length; i++) {
            var parts = cookies[i].trim().split('=');
            var cookieName = parts.shift();
            if (cookieName === name) {
                var rawValue = parts.join('=');
                try {
                    return decodeURIComponent(rawValue);
                } catch (error) {
                    return rawValue;
                }
            }
        }
        return null;
    }

    function writeCookie(theme) {
        var attributes = ['Path=/', 'Max-Age=31536000', 'SameSite=Lax'];
        var hostname = location.hostname.toLowerCase();
        if (hostname === 'bkper.app' || hostname.endsWith('.bkper.app')) {
            attributes.push('Domain=.bkper.app');
        }
        if (location.protocol === 'https:') {
            attributes.push('Secure');
        }
        document.cookie = THEME_COOKIE + '=' + encodeURIComponent(theme) + '; ' + attributes.join('; ');
    }

    function getLegacyTheme() {
        try {
            var theme = localStorage.getItem(LEGACY_THEME_KEY);
            return isTheme(theme) ? theme : null;
        } catch (error) {
            return null;
        }
    }

    function removeLegacyTheme() {
        try {
            localStorage.removeItem(LEGACY_THEME_KEY);
        } catch (error) {
            // Ignore unavailable storage.
        }
    }

    function storeTheme(theme) {
        writeCookie(theme);
        removeLegacyTheme();
    }

    function getTheme() {
        var theme = getCookie(THEME_COOKIE);
        if (isTheme(theme)) {
            return theme;
        }

        var legacyTheme = getLegacyTheme();
        removeLegacyTheme();
        if (legacyTheme) {
            writeCookie(legacyTheme);
            return legacyTheme;
        }

        return 'dark';
    }

    function isSystemDark() {
        return Boolean(
            window.matchMedia && window.matchMedia(DARK_MEDIA_QUERY).matches
        );
    }

    function resolveTheme(theme) {
        if (theme === 'system') {
            return isSystemDark() ? 'dark' : 'light';
        }
        return theme === 'light' ? 'light' : 'dark';
    }

    function applyTheme(theme) {
        var resolvedTheme = resolveTheme(theme);
        var html = document.documentElement;
        html.classList.toggle('wa-dark', resolvedTheme === 'dark');
        html.style.colorScheme = resolvedTheme;
    }

    applyTheme(getTheme());

    if (window.matchMedia) {
        var mediaQueryList = window.matchMedia(DARK_MEDIA_QUERY);
        var systemThemeChanged = function () {
            var theme = getTheme();
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

    window.addEventListener('message', function (event) {
        if (
            !event.source ||
            event.source === window ||
            (event.source !== window.parent && event.source !== window.opener)
        ) {
            return;
        }

        var data = event.data;
        if (!data || data.type !== THEME_MESSAGE || !isTheme(data.theme)) {
            return;
        }

        if (getTheme() !== data.theme) {
            storeTheme(data.theme);
        }
        applyTheme(data.theme);
    });
})();
