# @bkper/web-design

Bkper's design system - CSS variables, tokens, and themes.

[![npm](https://img.shields.io/npm/v/@bkper/web-design?color=%235889e4)](https://www.npmjs.com/package/@bkper/web-design)

## Documentation

- [Developer Docs](https://bkper.com/docs/)

## Installation

```bash
npm install @bkper/web-design
```

## Usage

Import in your build system:

```css
@import '@bkper/web-design';
```

Or link directly in HTML:

```html
<link rel="stylesheet" href="node_modules/@bkper/web-design/src/bkper.css" />
```

Alternatively, skip installation and link directly to a hosted version (CDN):

```html
<link rel="stylesheet" href="https://bkper.app/design/v2/style.css" />
```

Note: The CDN serves the most recent npm release.

## Web Awesome Integration

This package works standalone with sensible default values. If [Web Awesome](https://www.webawesome.com/) is loaded, Bkper tokens will automatically inherit from Web Awesome's design system for seamless integration.

## Design Tokens

<!-- TOKENS:START -->

### Typography

| Token | Default | Web Awesome Fallback |
| :--- | :--- | :--- |
| `--bkper-font-family` | `ui-sans-serif, system-ui, sans-serif` | `--wa-font-family-body` |
| `--bkper-font-family-code` | `ui-monospace, monospace` | `--wa-font-family-code` |
| `--bkper-font-size-x-small` | `0.75rem` | `--wa-font-size-xs` |
| `--bkper-font-size-small` | `0.85rem` | — |
| `--bkper-font-size-medium` | `1rem` | `--wa-font-size-m` |
| `--bkper-font-size-large` | `1.25rem` | `--wa-font-size-l` |
| `--bkper-font-weight-bold` | `600` | `--wa-font-weight-bold` |
| `--bkper-line-height-normal` | `1.8` | — |

### Border

| Token | Default | Web Awesome Fallback |
| :--- | :--- | :--- |
| `--bkper-border` | `1px solid var(--bkper-color-border)` | — |
| `--bkper-border-radius` | `0.375rem` | `--wa-border-radius-m` |

### Spacing

| Token | Default | Web Awesome Fallback |
| :--- | :--- | :--- |
| `--bkper-spacing-3x-small` | `0.125rem` | `--wa-space-3xs` |
| `--bkper-spacing-2x-small` | `0.25rem` | `--wa-space-2xs` |
| `--bkper-spacing-x-small` | `0.5rem` | `--wa-space-xs` |
| `--bkper-spacing-small` | `0.75rem` | `--wa-space-s` |
| `--bkper-spacing-medium` | `1rem` | `--wa-space-m` |
| `--bkper-spacing-large` | `1.5rem` | `--wa-space-l` |
| `--bkper-spacing-x-large` | `2rem` | `--wa-space-xl` |
| `--bkper-spacing-2x-large` | `2.5rem` | `--wa-space-2xl` |
| `--bkper-spacing-3x-large` | `3rem` | `--wa-space-3xl` |
| `--bkper-spacing-4x-large` | `4rem` | `--wa-space-4xl` |

### Color

| Token | Default | Web Awesome Fallback |
| :--- | :--- | :--- |
| `--bkper-color-black` | `#1b1d26` | — |
| `--bkper-color-white` | `#f1f2f3` | — |
| `--bkper-color-primary` | `#0071ec` | `--wa-color-brand-50` |
| `--bkper-color-success` | `#00883c` | `--wa-color-success-50` |
| `--bkper-color-danger` | `#dc3146` | `--wa-color-danger-50` |
| `--bkper-color-warning` | `#b45f04` | `--wa-color-warning-50` |
| `--bkper-color-focus` | `#3e96ff` | `--wa-color-focus` |

### Contextual Colors

These tokens change between light and dark themes.

| Token | Light | Dark | Web Awesome Fallback |
| :--- | :--- | :--- | :--- |
| `--bkper-color-text` | `var(--bkper-color-black)` | `var(--bkper-color-white)` | `--wa-color-text-normal` |
| `--bkper-color-link` | `#0053c0` | `#6eb3ff` | `--wa-color-text-link` |
| `--bkper-color-background` | `white` | `#101219` | `--wa-color-surface-default` |
| `--bkper-color-border` | `#e4e5e9` | `#2f323f` | `--wa-color-surface-border` |
| `--bkper-color-neutral` | `#2f323f` | `#e4e5e9` | `--wa-color-neutral-20` |

#### Account Type Colors

Five color families map to Bkper account types, each at three intensity levels. Values change between themes for optimal contrast.

**Grey — Neutral**

| Level | Token | Light | Dark |
| :--- | :--- | :--- | :--- |
| low | `--bkper-color-grey-low` | `#f5f5f5` | `#3A3A3A` |
| medium | `--bkper-color-grey-medium` | `#ccc` | `#6d6d6d` |
| high | `--bkper-color-grey-high` | `#3A3A3A` | `#bfb8b8` |

**Blue — Assets**

| Level | Token | Light | Dark |
| :--- | :--- | :--- | :--- |
| low | `--bkper-color-blue-low` | `#dfedf6` | `#1d4268` |
| medium | `--bkper-color-blue-medium` | `#afd4e9` | `#3478bc` |
| high | `--bkper-color-blue-high` | `#3478bc` | `#50a4d9` |

**Yellow — Liabilities**

| Level | Token | Light | Dark |
| :--- | :--- | :--- | :--- |
| low | `--bkper-color-yellow-low` | `#fef3d8` | `#664900` |
| medium | `--bkper-color-yellow-medium` | `#fce39c` | `#cc9200` |
| high | `--bkper-color-yellow-high` | `#cc9200` | `#e3bb56` |

**Green — Incoming**

| Level | Token | Light | Dark |
| :--- | :--- | :--- | :--- |
| low | `--bkper-color-green-low` | `#e2f3e7` | `#0d3514` |
| medium | `--bkper-color-green-medium` | `#b8e0c3` | `#228c33` |
| high | `--bkper-color-green-high` | `#228c33` | `#36cf64` |

**Red — Outgoing**

| Level | Token | Light | Dark |
| :--- | :--- | :--- | :--- |
| low | `--bkper-color-red-low` | `#f6deda` | `#631b13` |
| medium | `--bkper-color-red-medium` | `#eebbb4` | `#bf4436` |
| high | `--bkper-color-red-high` | `#bf4436` | `#eb7763` |

### Deprecated Tokens

These aliases are kept for backward compatibility. Use the replacement token instead.

| Deprecated Token | Replacement |
| :--- | :--- |
| `--bkper-font-color-default` | `--bkper-color-text` |
| `--bkper-border-color` | `--bkper-color-border` |
| `--bkper-background-color` | `--bkper-color-background` |
| `--bkper-link-color` | `--bkper-color-link` |

<!-- TOKENS:END -->

## License

Apache-2.0
