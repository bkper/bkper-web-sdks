# Changelog

This is the first publication of the Bkper design system as an npm package. The package has been served internally and publicly at `https://bkper.app/design/v2/style.css` prior to this release.

**Version History**: Version 2.x introduced a token-based design system with Web Awesome integration and Bkper-specific account type colors. Version 1.x was a simple CSS file without a token system.

## 2.1.0
- Add large spacing tokens: `--bkper-spacing-2x-large`, `--bkper-spacing-3x-large`, `--bkper-spacing-4x-large`
- Add `--bkper-color-focus` token
- Update `--bkper-font-family` to use system font stack via Web Awesome
- Fix hardcoded fallback values for `--bkper-color-primary`, `--bkper-color-success`, `--bkper-color-danger`, `--bkper-color-warning`, `--bkper-color-black`, `--bkper-color-white` to use theme-appropriate hex values when Web Awesome tokens are not available
- Standardize color variable naming: `--bkper-color-text`, `--bkper-color-link`, `--bkper-color-background`, `--bkper-color-border`
- Deprecated old variable names (`--bkper-font-color-default`, `--bkper-border-color`, `--bkper-background-color`, `--bkper-link-color`) with backward-compatible aliases

## 2.0.2
- Add font family tokens: `--bkper-font-family`, `--bkper-font-family-code`

## 2.0.0

- Initial npm publication of Bkper's design system
- CSS custom properties (CSS variables) with `bkper-*` prefix
- Account type colors: blue (Assets), yellow (Liabilities), green (Incoming), red (Outgoing)
- Light and dark theme support
- Typography scale (font sizes, weights, line heights)
- Spacing scale (from 3x-small to x-large)
- Border and color tokens
- Web Awesome integration with sensible fallback values
