# @bkper/web-auth

OAuth authentication SDK for apps on the [Bkper Platform](https://bkper.com/docs/build/apps/overview) (`*.bkper.app` subdomains).

[![npm](https://img.shields.io/npm/v/@bkper/web-auth?color=%235889e4)](https://www.npmjs.com/package/@bkper/web-auth)

## Documentation

-   [Developer Docs](https://bkper.com/docs/)
-   [API Reference](https://bkper.com/docs/api/bkper-web-auth)

## Installation

```bash tab="bun"
bun add @bkper/web-auth
```

```bash tab="npm"
npm i -S @bkper/web-auth
```

```bash tab="pnpm"
pnpm add @bkper/web-auth
```

```bash tab="yarn"
yarn add @bkper/web-auth
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
    },
});

// Initialize authentication flow on app load
await auth.init();

// Make an authenticated request with automatic token refresh and one retry
const response = await auth.authenticatedFetch('/data');
```

## Authenticated Requests

`authenticatedFetch()` implements the standard Fetch API contract. It adds the current bearer token to a request. If the response is `401`, it refreshes the token and retries exactly once. Other response statuses are returned unchanged.

```typescript
const response = await auth.authenticatedFetch('/data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ value: 42 }),
});
```

The method can also be supplied to any HTTP client that accepts a Fetch-compatible function:

```typescript
const fetchWithAuth = auth.authenticatedFetch.bind(auth);
```

Call `init()` before the first authenticated request. If no token is available, or the session cannot be refreshed, `onLoginRequired` is called and the request rejects with an authentication-required error. If the retried request also returns `401`, that response is returned without another retry. Concurrent refresh calls share one refresh request.

To prevent accidental token disclosure, authenticated requests are restricted to:

- HTTPS origins on `bkper.app` or its subdomains
- The current `localhost` or `127.0.0.1` origin during local development

Request paths are not restricted.

### Using with bkper-js

`@bkper/web-auth` does not depend on `bkper-js`, but they can be connected through the client configuration. Provide the current token for each request and refresh it when the Bkper API reports an expired login:

```typescript
import { Bkper } from 'bkper-js';

const bkper = new Bkper({
    oauthTokenProvider: async () => auth.getAccessToken(),
    requestRetryHandler: async (status, _error, attempt) => {
        if (status === 403 && attempt === 1) {
            await auth.refresh();
        }
    },
});
```

`bkper-js` owns its request and retry lifecycle. `@bkper/web-auth` remains responsible only for the current access token and session refresh.

## What's Included

-   OAuth authentication SDK for apps on `*.bkper.app` subdomains
-   Callback-based API for authentication events
-   OAuth flow with in-memory token management
-   Single-flight token refresh mechanism
-   Authenticated Fetch API with one-time refresh and retry
-   TypeScript support with full type definitions

## How It Works

**Session Persistence:**

-   Access tokens are stored in-memory (cleared on page refresh)
-   Sessions persist via HTTP-only cookies scoped to the `.bkper.app` domain
-   Call `init()` on app load to restore an access token from the session
-   Protected resources still require `Authorization: Bearer <token>`; session cookies only restore client auth state

> **Note:** This SDK only works for apps hosted on `*.bkper.app` subdomains. Applications on other domains must provide a valid access token through their own authentication mechanism.

**Security:**

-   HTTP-only cookies protect refresh tokens from XSS
-   In-memory access tokens minimize exposure

## TypeScript Support

This package is written in TypeScript and provides full type definitions out of the box. All public APIs are fully typed, including callbacks and configuration options.

```typescript
import { BkperAuth, BkperAuthConfig } from '@bkper/web-auth';

const config: BkperAuthConfig = {
    onLoginSuccess: () => console.log('Authenticated'),
    onError: error => console.error('Auth error:', error),
};

const auth = new BkperAuth(config);
```

## Browser Compatibility

This package requires a modern browser with support for:

-   [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API#browser_compatibility) for HTTP requests
-   [Location API](https://developer.mozilla.org/en-US/docs/Web/API/Location) for login/logout redirects

The app must be deployed to a `*.bkper.app` subdomain for session-cookie token restoration to work.

## API Reference

### BkperAuth

The main authentication client class.

#### Constructor

```typescript
new BkperAuth(config?: BkperAuthConfig)
```

#### Methods

-   **`init(): Promise<void>`** - Initialize auth state by attempting to refresh the token. Triggers `onLoginSuccess` if successful, `onLoginRequired` if authentication is needed, or `onError` if refresh fails. Call on app load.
-   **`login(): void`** - Request the start of the login flow.
-   **`refresh(): Promise<void>`** - Refresh the access token. Concurrent calls share one refresh request. Triggers `onTokenRefresh` if successful or `onError` if refresh fails.
-   **`authenticatedFetch(input, init?): Promise<Response>`** - Send an authenticated Fetch API request, refreshing and retrying once after `401`.
-   **`logout(): void`** - Request the start of the logout flow. Triggers `onLogout` callback.
-   **`getAccessToken(): string | undefined`** - Get the current access token.

### BkperAuthConfig

Configuration options for the auth client.

#### Properties

-   **`baseUrl?: string`** - Override the authentication service URL (for testing/development).
-   **`onLoginSuccess?: () => void`** - Called when login succeeds.
-   **`onLoginRequired?: () => void`** - Called when login is required.
-   **`onLogout?: () => void`** - Called when user logs out.
-   **`onTokenRefresh?: (token: string) => void`** - Called when token is refreshed.
-   **`onError?: (error: unknown) => void`** - Called when an auth error occurs.
-   **`getAdditionalAuthParams?: () => Record<string, string>`** - Provide additional parameters for auth requests.

## License

Apache-2.0
