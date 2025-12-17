/**
 * Configuration options for the BkperAuth class.
 */
export interface BkperAuthConfig {

    /**
     * Override the authentication service base URL.
     *
     * Most users don't need this. The default production URL works out of the box.
     *
     * Use cases:
     * - Testing: Point to a mock authentication service for integration tests
     * - Development: Use a local mock server
     *
     * @example
     * ```typescript
     * // Testing with mock server
     * const auth = new BkperAuth({
     *   baseUrl: 'http://localhost:3000/mock-auth'
     * });
     * ```
     */
    baseUrl?: string;

    /**
     * Called when the access token is refreshed.
     *
     * @param token - The new access token
     */
    onTokenRefresh?: (token: string) => void;

    /**
     * Called when login succeeds (user is authenticated).
     */
    onLoginSuccess?: () => void;

    /**
     * Called when login is required (user needs to sign in).
     */
    onLoginRequired?: () => void;

    /**
     * Called when the user logs out.
     */
    onLogout?: () => void;

    /**
     * Called when an error occurs during authentication.
     *
     * @param error - The error that occurred
     */
    onError?: (error: Error) => void;

    /**
     * Provide additional parameters to send to the authentication service.
     *
     * Useful for custom authentication flows or passing additional context
     * to your authentication implementation.
     *
     * @returns Record of key-value pairs to append to auth requests
     *
     * @example
     * ```typescript
     * // Custom authentication context
     * const auth = new BkperAuth({
     *   getAdditionalAuthParams: () => {
     *     const token = new URLSearchParams(location.search).get('custom-token');
     *     return token ? { customToken: token } : {};
     *   }
     * });
     * ```
     */
    getAdditionalAuthParams?: () => Record<string, string>;

}
