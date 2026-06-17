# @bkper/web-components

Framework-agnostic browser helpers and future web components for Bkper apps.

[![npm](https://img.shields.io/npm/v/@bkper/web-components?color=%235889e4)](https://www.npmjs.com/package/@bkper/web-components)

## Installation

Install this package when you want to use bundled helpers:

```bash
bun add @bkper/web-components
```

```bash
npm i -S @bkper/web-components
```

For first-paint theme initialization, apps can load the CDN script directly without installing the package.

## Theme init script

Use the blocking classic script before loading app modules to avoid a wrong-theme first paint:

```html
<script
    src="https://cdn.jsdelivr.net/npm/@bkper/web-components@0.2.0/dist/theme-init.global.js"
    crossorigin="anonymous"
></script>
```

The global script is intentionally small and self-contained. It reads the persisted Bkper theme, applies the resolved theme to `<html>`, and listens for theme messages from a parent/opener Bkper shell.

This is the recommended default for embedded Bkper apps.

## Bundled theme helpers

Use `@bkper/web-components/theme` when bundled client code needs access to the same theme rules:

```ts
import {
    applyTheme,
    createThemeChangeMessage,
    getTheme,
    isDarkTheme,
    setTheme,
} from '@bkper/web-components/theme';

applyTheme(getTheme());
setTheme('dark');
applyTheme('dark');

const dark = isDarkTheme();
iframeWindow.postMessage(createThemeChangeMessage('dark'), targetOrigin);
```

The bundled helpers centralize theme constants, persistence, migration, message shape, theme resolution, and DOM application. App shells still own rendering, event-bus integration, and component placement.

Do not import a bundled auto-initializer when the global init script is already present. Use explicit helpers from `@bkper/web-components/theme` instead.

Visible custom elements may be added in future releases when there is a concrete shared UI use case.

## Browser compatibility

This package targets modern browsers with `classList`, cookies, and `matchMedia` support. The root theme helper entrypoint can be imported by SSR/build tooling. The global theme init script is a classic script intended to run in a browser `<head>` before app modules.

## License

Apache-2.0
