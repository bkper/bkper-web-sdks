# Changelog

This package extracts and formalizes the authentication logic previously embedded in Bkper client applications, providing a standalone, framework-agnostic SDK for OAuth authentication with the Bkper API.

## 1.1.0

- Add authenticated Fetch API requests with one-time refresh and retry on `401`
- Restrict authenticated requests to Bkper origins and the current local development origin
- Coalesce concurrent token refresh requests

## 1.0.0

- Initial npm publication of Bkper's authentication SDK
- Framework-agnostic design
- Callback-based API for authentication events
- OAuth flow with in-memory token management
- Token refresh mechanism with automatic retry
- TypeScript support with full type definitions
