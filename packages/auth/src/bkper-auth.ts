import { BkperAuthConfig } from './types';

const DEFAULT_BASE_URL = 'https://bkper.app';

/**
 * OAuth authentication client for the Bkper API.
 *
 * Provides framework-agnostic authentication with callback-based event handling.
 * Access tokens are stored in-memory; sessions persist via HTTP-only cookies.
 *
 * @example
 * ```typescript
 * // Initialize authentication client
 * const auth = new BkperAuth({
 *   onLoginSuccess: () => loadUserData(),
 *   onLoginRequired: () => showLoginButton()
 * });
 *
 * // Restore session on app load
 * await auth.init();
 * ```
 */
export class BkperAuth {

    private config: BkperAuthConfig;
    private baseUrl: string;

    private accessToken: string | undefined;
    private refreshPromise: Promise<void> | undefined;

    // Authentication service endpoints
    private readonly AUTH_LOGIN_PATH = '/auth/login';
    private readonly AUTH_REFRESH_PATH = '/auth/refresh';
    private readonly AUTH_LOGOUT_PATH = '/auth/logout';

    /**
     * Creates a new BkperAuth instance.
     *
     * @param config - Optional configuration for the auth client
     *
     * @example
     * ```typescript
     * // Simple usage with defaults
     * const auth = new BkperAuth();
     *
     * // With callbacks
     * const auth = new BkperAuth({
     *   onLoginSuccess: () => console.log('Logged in!'),
     *   onLoginRequired: () => showLoginDialog(),
     *   onError: (error) => console.error(error)
     * });
     * ```
     */
    constructor(config: BkperAuthConfig = {}) {
        this.config = config;
        this.baseUrl = config.baseUrl || DEFAULT_BASE_URL;
    }

    /**
     * Gets the current access token.
     *
     * @returns The access token if authenticated, undefined otherwise
     *
     * Use `authenticatedFetch()` for Fetch API requests. This getter is
     * available for HTTP clients that accept an access-token provider.
     *
     * @example
     * ```typescript
     * const tokenProvider = async () => auth.getAccessToken();
     * ```
     */
    getAccessToken(): string | undefined {
        return this.accessToken;
    }

    /**
     * Performs an authenticated request and retries it once after refreshing an
     * expired or invalid access token.
     *
     * Concurrent refresh calls share the same refresh request. A second 401
     * response is returned without another retry.
     *
     * Call `init()` before the first request. Bearer tokens are sent only to
     * HTTPS Bkper origins or the current local development origin. Request
     * paths are not restricted.
     */
    async authenticatedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
        const request = new Request(input, init);
        this.requireAllowedRequestOrigin(request);

        const response = await this.fetchWithAccessToken(request);
        if (response.status !== 401) {
            return response;
        }

        await this.refresh();
        return this.fetchWithAccessToken(request);
    }

    /**
     * Initializes the authentication state by attempting to refresh the access token.
     *
     * Call this method when your app loads to restore the user's session.
     * Triggers `onLoginSuccess` if a valid session exists, or `onLoginRequired` if login is needed.
     *
     */
    async init(): Promise<void> {
        try {
            await this.refresh();
            this.checkAccessToken();
        } catch {
            // refresh() already clears auth state and reports the error.
        }
    }

    private checkAccessToken(): void {
        if (this.accessToken) {
            if (this.config.onLoginSuccess) {
                this.config.onLoginSuccess();
            }
        } else {
            if (this.config.onLoginRequired) {
                this.config.onLoginRequired();
            }
        }
    }

    /**
     * Redirects the user to the login page.
     *
     * The user will be redirected to the authentication service to complete the login flow.
     * After successful login, they will be redirected back to the current page.
     *
     * @example
     * ```typescript
     * // Trigger login when user clicks a button
     * loginButton.addEventListener('click', () => {
     *   auth.login();
     * });
     * ```
     */
    login(): void {
        const loginUrl = this.getLoginUrl();
        self.location?.assign(loginUrl);
    }

    /**
     * Refreshes the access token using the current session.
     *
     * Concurrent calls share one refresh request. Triggers `onTokenRefresh`
     * if successful and throws if the refresh request fails.
     *
     * `authenticatedFetch()` calls this method automatically after a 401.
     * Consumers can also call it explicitly when they need a new token.
     *
     * @example
     * ```typescript
     * await auth.refresh();
     * const token = auth.getAccessToken();
     * ```
     */
    async refresh(): Promise<void> {
        if (!this.refreshPromise) {
            this.refreshPromise = this.performRefresh().finally(() => {
                this.refreshPromise = undefined;
            });
        }
        return this.refreshPromise;
    }

    private async performRefresh(): Promise<void> {
        try {
            const url = this.getRefreshUrl();
            const options: RequestInit = {
                method: 'POST',
                credentials: 'include',
            };
            const response = await fetch(url, options);
            if (response.status === 200) {
                const data: unknown = await response.json();
                if (!this.hasAccessToken(data)) {
                    throw new Error('Invalid auth response: missing or invalid accessToken');
                }
                this.accessToken = data.accessToken;
                this.config.onTokenRefresh?.(data.accessToken);
                return;
            }
            if (response.status === 401) {
                this.accessToken = undefined;
                return;
            }
            throw new Error(response.statusText);
        } catch (error: unknown) {
            this.accessToken = undefined;
            this.config.onError?.(error);
            throw error;
        }
    }

    private async fetchWithAccessToken(request: Request): Promise<Response> {
        const headers = new Headers(request.headers);
        headers.set('Authorization', `Bearer ${this.requireAccessToken()}`);
        return fetch(new Request(request.clone(), { headers }));
    }

    private requireAccessToken(): string {
        const token = this.accessToken?.trim();
        if (token) {
            return token;
        }
        this.config.onLoginRequired?.();
        throw new Error('Authentication required.');
    }

    private requireAllowedRequestOrigin(request: Request): void {
        const requestUrl = new URL(request.url);
        const currentUrl = new URL(self.location.href);
        const isAllowed = this.isLocalHostname(currentUrl.hostname)
            ? requestUrl.origin === currentUrl.origin
            : requestUrl.protocol === 'https:' && this.isBkperHostname(requestUrl.hostname);

        if (!isAllowed) {
            throw new Error(
                'Authenticated requests are restricted to HTTPS Bkper origins or the current local development origin.'
            );
        }
    }

    private isBkperHostname(hostname: string): boolean {
        return hostname === 'bkper.app' || hostname.endsWith('.bkper.app');
    }

    private isLocalHostname(hostname: string): boolean {
        return hostname === 'localhost' || hostname === '127.0.0.1';
    }

    private hasAccessToken(value: unknown): value is { accessToken: string } {
        if (typeof value !== 'object' || value === null) {
            return false;
        }
        const accessToken = Reflect.get(value, 'accessToken');
        return typeof accessToken === 'string' && accessToken.length > 0;
    }

    /**
     * Logs out the user and redirects to the logout page.
     *
     * Triggers the `onLogout` callback before redirecting.
     * The user's session will be terminated.
     *
     * @example
     * ```typescript
     * // Logout when user clicks logout button
     * logoutButton.addEventListener('click', () => {
     *   auth.logout();
     * });
     * ```
     */
    logout(): void {
        if (this.config.onLogout) {
            this.config.onLogout();
        }
        const logoutUrl = this.getLogoutUrl();
        self.location?.assign(logoutUrl);
    }

    private getLoginUrl(): string {

        const returnUrl = encodeURIComponent(self.location.href);

        let loginUrl = `${this.baseUrl}${this.AUTH_LOGIN_PATH}?returnUrl=${returnUrl}`;

        // Add additional auth parameters if provided
        if (this.config.getAdditionalAuthParams) {
            const additionalParams = this.config.getAdditionalAuthParams();
            for (const [key, value] of Object.entries(additionalParams)) {
                loginUrl += `&${key}=${encodeURIComponent(value)}`;
            }
        }

        return loginUrl;
    }

    private getRefreshUrl(): string {

        let refreshUrl = `${this.baseUrl}${this.AUTH_REFRESH_PATH}`;

        // Add additional auth parameters if provided
        if (this.config.getAdditionalAuthParams) {
            const additionalParams = this.config.getAdditionalAuthParams();
            const params = new URLSearchParams(additionalParams);
            const queryString = params.toString();
            if (queryString) {
                refreshUrl += `?${queryString}`;
            }
        }

        return refreshUrl;
    }

    private getLogoutUrl(): string {
        return `${this.baseUrl}${this.AUTH_LOGOUT_PATH}`;
    }

}
