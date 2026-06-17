# Changelog

## 0.2.0

- Simplified the public surface to explicit bundled theme helpers and the first-paint theme initialization script.
- Removed the experimental `<bkper-theme-toggle>` entrypoint until there is a concrete shared UI component use case.
- Removed the bundled side-effect theme initializer to keep first-paint global initialization separate from bundled client services.
- Moved the global theme initialization source to TypeScript while keeping the published `dist/theme-init.global.js` classic script self-contained.

## 0.1.0

- Initial release with theme helpers, first-paint theme initialization script, and `<bkper-theme-toggle>`.
