# @bkper/web-auth

Framework-agnostic OAuth authentication SDK for Bkper API.

[![npm](https://img.shields.io/npm/v/@bkper/web-auth?color=%235889e4)](https://www.npmjs.com/package/@bkper/web-auth)

## Documentation

* [Developer Docs](https://bkper.com/docs/)

## Installation

```bash
npm install @bkper/web-auth
```

## Quick Start

```typescript
import { BkperAuth } from '@bkper/web-auth';

// Initialize client with callbacks
const auth = new BkperAuth({
  onLoginSuccess: () => {
    console.log('User authenticated!');
    loadUserData();
  },
  onLoginRequired: () => {
    console.log('Please sign in');
    showLoginButton();
  }
});

// Initialize authentication flow on app load
await auth.init();

// Trigger login
auth.login();

// Get access token for API calls
const token = auth.getAccessToken();
if (token) {
  fetch('/api/data', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
}
```

## What's Included

- Framework-agnostic OAuth authentication SDK for Bkper API
- Callback-based API for authentication events
- OAuth flow with in-memory token management
- Token refresh mechanism with automatic retry
- TypeScript support with full type definitions

## TypeScript Support

This package is written in TypeScript and provides full type definitions out of the box. All public APIs are fully typed, including callbacks and configuration options.

```typescript
import { BkperAuth, BkperAuthConfig } from '@bkper/web-auth';

const config: BkperAuthConfig = {
  onLoginSuccess: () => console.log('Authenticated'),
  onError: (error) => console.error('Auth error:', error)
};

const auth = new BkperAuth(config);
```

## Browser Compatibility

This package requires modern web browsers with native [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API#browser_compatibility) support. It uses standard web APIs and works in any JavaScript environment that supports modern browser features.

## API Reference

### BkperAuth

The main authentication client class.

#### Constructor

```typescript
new BkperAuth(config?: BkperAuthConfig)
```

#### Methods

- **`init(): Promise<void>`** - Initialize auth state by attempting to refresh the token. Call on app load.
- **`login(): void`** - Request the start of the login flow.
- **`refresh(): Promise<void>`** - Refresh the access token. Call to renew authentication silently.
- **`logout(): void`** - Request the start of the logout flow.
- **`getAccessToken(): string | undefined`** - Get the current access token.

### BkperAuthConfig

Configuration options for the auth client.

#### Properties

- **`baseUrl?: string`** - Override the authentication service URL (for testing/development).
- **`onLoginSuccess?: () => void`** - Called when login succeeds.
- **`onLoginRequired?: () => void`** - Called when login is required.
- **`onLogout?: () => void`** - Called when user logs out.
- **`onTokenRefresh?: (token: string) => void`** - Called when token is refreshed.
- **`onError?: (error: unknown) => void`** - Called when an auth error occurs.
- **`getAdditionalAuthParams?: () => Record<string, string>`** - Provide additional parameters for auth requests.

## License

Apache-2.0
