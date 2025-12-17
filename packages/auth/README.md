# @bkper/web-auth

Framework-agnostic OAuth authentication SDK for Bkper API.

## Documentation

* [Developer Docs](https://bkper.com/docs/) is coming soon as part of the Bkper web packages documentation site.

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
  },
  onError: (error) => {
    console.error('Auth error:', error);
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
- OAuth flow with cookie-based session persistence
- Token refresh mechanism with automatic retry
- TypeScript support with full type definitions

## License

Apache-2.0
