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
     * @example
     * ```typescript
     * const token = auth.getAccessToken();
     * if (token) {
     *   // Make authenticated API calls
     *   fetch('/api/data', {
     *     headers: { 'Authorization': `Bearer ${token}` }
     *   });
     * }
     * ```
     */
    getAccessToken(): string | undefined {
        return this.accessToken;
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
        } catch (error: unknown) {
            if (this.config.onError) {
                this.config.onError(error);
            }
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
     * Call this when API requests return 403 to get a new token and retry.
     * Triggers `onTokenRefresh` callback if successful.
     * Throws error if the refresh fails (network error, expired session, etc.).
     *
     * @example
     * ```typescript
     * // Handle 403 by refreshing and retrying
     * const response = await fetch('/api/data', {
     *   headers: { 'Authorization': `Bearer ${auth.getAccessToken()}` }
     * });
     *
     * if (response.status === 403) {
     *   await auth.refresh();
     *   // Retry with new token
     *   return fetch('/api/data', {
     *     headers: { 'Authorization': `Bearer ${auth.getAccessToken()}` }
     *   });
     * }
     * ```
     */
    async refresh(): Promise<void> {

        const url = this.getRefreshUrl();

        const options: RequestInit = {
            method: 'POST',
            credentials: 'include', // Send cookies
        };

        return fetch(url, options)
            .then(response => {
                if (response.status === 200) {
                    return response.json().then(data => {
                        // Validate response shape
                        if (!data || typeof data.accessToken !== 'string' || !data.accessToken) {
                            return Promise.reject(new Error('Invalid auth response: missing or invalid accessToken'));
                        }
                        this.accessToken = data.accessToken;
                        if (this.config.onTokenRefresh && this.accessToken) {
                            this.config.onTokenRefresh(this.accessToken);
                        }
                        return;
                    });
                } else if (response.status === 401) {
                    this.accessToken = undefined;
                    return;
                } else {
                    return Promise.reject(new Error(response.statusText));
                }
            })
            .catch((error) => {
                this.accessToken = undefined;
                if (this.config.onError) {
                    this.config.onError(error);
                }
                return Promise.reject(error);
            });
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
