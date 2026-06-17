# @bkper/web-components

Framework-agnostic web components and browser helpers for Bkper apps.

[![npm](https://img.shields.io/npm/v/@bkper/web-components?color=%235889e4)](https://www.npmjs.com/package/@bkper/web-components)

## Installation

```bash
bun add @bkper/web-components
```

```bash
npm i -S @bkper/web-components
```

## Theme

Use the blocking classic script before loading app modules to avoid a wrong-theme first paint:

```html
<script
    src="https://cdn.jsdelivr.net/npm/@bkper/web-components@0.1.0/dist/theme-init.global.js"
    crossorigin="anonymous"
></script>
```

Use `@bkper/web-components/theme` for shared theme helpers:

```ts
import { applyTheme, getTheme, setTheme } from '@bkper/web-components/theme';

applyTheme(getTheme());
setTheme('dark');
applyTheme('dark');
```

Or initialize theme synchronization from a module:

```ts
import { initializeTheme } from '@bkper/web-components/theme';

const unsubscribe = initializeTheme();
```

For side-effect initialization, import the dedicated entrypoint:

```ts
import '@bkper/web-components/theme/init';
```

The root package entrypoint exports the SSR-safe theme helpers. Browser custom elements are exposed through their own entrypoints.

## Theme toggle

Register the custom element in browser code:

```ts
import '@bkper/web-components/theme-toggle';
```

```html
<bkper-theme-toggle></bkper-theme-toggle>
```

The toggle cycles through `system`, `dark`, and `light`, persists the selected theme in the `bkper_theme` cookie, applies the resolved theme to `<html>`, and keeps multiple toggles synchronized on the same page.

## Browser compatibility

This package targets modern browsers with Custom Elements, `classList`, cookies, and `matchMedia` support. The root theme helper entrypoint can be imported by SSR/build tooling, but the custom element entrypoints must only run in a browser-like environment.

## License

Apache-2.0
