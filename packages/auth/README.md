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

// Get access token for API calls
const token = auth.getAccessToken();
if (token) {
  fetch('/api/data', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
}
```

## Handling Token Expiration

Access tokens expire and need to be refreshed. The recommended pattern is to handle authentication errors and retry:

```typescript
async function apiRequest(url: string, options: RequestInit = {}) {

  // Add auth header
  const token = auth.getAccessToken();
  options.headers = {
    ...options.headers,
    'Authorization': `Bearer ${token}`
  };

  const response = await fetch(url, options);

  // Handle expired token
  if (response.status === 403) {
    try {
      await auth.refresh();
      options.headers = {
        ...options.headers,
        'Authorization': `Bearer ${auth.getAccessToken()}`
      };
      return fetch(url, options); // Retry once
    } catch (error) {
      // Refresh failed - the onError callback will be triggered
      // Handle the error appropriately (e.g., redirect to login, show error message)
      throw error;
    }
  }

  return response;
}
```

## What's Included

- Framework-agnostic OAuth authentication SDK for Bkper API
- Callback-based API for authentication events
- OAuth flow with in-memory token management
- Token refresh mechanism
- TypeScript support with full type definitions

## How It Works

**Session Persistence:**
- Access tokens are stored in-memory (cleared on page refresh)
- Sessions persist via HTTP-only cookies (managed by Bkper's authentication service)
- Call `init()` on app load to restore the session from cookies

**Security:**
- HTTP-only cookies protect refresh tokens from XSS
- In-memory access tokens minimize exposure

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

This package requires modern web browsers with support for:
- [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API#browser_compatibility) for HTTP requests
- [Location API](https://developer.mozilla.org/en-US/docs/Web/API/Location) for login/logout redirects

The package uses standard web APIs and works in any JavaScript environment that supports modern browser features.

## API Reference

### BkperAuth

The main authentication client class.

#### Constructor

```typescript
new BkperAuth(config?: BkperAuthConfig)
```

#### Methods

- **`init(): Promise<void>`** - Initialize auth state by attempting to refresh the token. Triggers `onLoginSuccess` if successful, `onLoginRequired` if authentication is needed, or `onError` if refresh fails. Call on app load.
- **`login(): void`** - Request the start of the login flow.
- **`refresh(): Promise<void>`** - Refresh the access token. Triggers `onTokenRefresh` if successful or `onError` if refresh fails.
- **`logout(): void`** - Request the start of the logout flow. Triggers `onLogout` callback.
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
