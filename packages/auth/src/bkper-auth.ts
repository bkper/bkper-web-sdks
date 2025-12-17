import Cookies from 'js-cookie';
import { BkperAuthConfig } from './types';

const DEFAULT_BASE_URL = 'https://bkper.app';
const ALREADY_LOGGED_COOKIE = 'already-logged';

export class BkperAuth {

    private config: BkperAuthConfig;
    private baseUrl: string;

    private accessToken: string | undefined;

    // Authentication service endpoints
    private readonly AUTH_LOGIN_PATH = '/auth/login';
    private readonly AUTH_REFRESH_PATH = '/auth/refresh';
    private readonly AUTH_LOGOUT_PATH = '/auth/logout';

    constructor(config: BkperAuthConfig = {}) {
        this.config = config;
        this.baseUrl = config.baseUrl || DEFAULT_BASE_URL;
    }

    getAccessToken(): string | undefined {
        return this.accessToken;
    }

    isAlreadyLogged(): boolean {
        return Cookies.get(ALREADY_LOGGED_COOKIE) != null;
    }

    async init(): Promise<void> {
        try {
            await this.refresh();
            this.checkAccessToken();
        } catch (error) {
            // TODO: Phase 3 - Replace with onError callback
            if (this.config.onError) {
                this.config.onError(error as Error);
            }
        }
    }

    private checkAccessToken(): void {
        if (this.accessToken) {
            // TODO: Phase 3 - Replace with onLoginSuccess callback
            if (this.config.onLoginSuccess) {
                this.config.onLoginSuccess();
            }
        } else {
            // TODO: Phase 3 - Replace with onLoginRequired callback
            if (this.config.onLoginRequired) {
                this.config.onLoginRequired();
            }
        }
    }

    login(): void {
        const loginUrl = this.getLoginUrl();
        self.location?.assign(loginUrl);
    }

    async refresh(): Promise<void> {
        return this.refreshToken();
    }

    logout(): void {
        if (this.config.onLogout) {
            this.config.onLogout();
        }
        const logoutUrl = this.getLogoutUrl();
        self.location?.assign(logoutUrl);
    }

    private async refreshToken(): Promise<void> {

        const url = this.getRefreshUrl();

        const options: RequestInit = {
            method: 'POST',
            credentials: 'include', // Send cookies
        };

        return fetch(url, options)
            .then(response => {
                if (response.status === 200) {
                    return response.json().then(data => {
                        this.accessToken = data.accessToken;
                        Cookies.set(ALREADY_LOGGED_COOKIE, 'true');
                        // TODO: Phase 3 - Replace with onTokenRefresh callback
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
                return Promise.reject(error);
            });
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
