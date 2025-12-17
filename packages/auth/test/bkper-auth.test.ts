import { describe, it, expect, beforeEach, vi } from 'vitest';
import Cookies from 'js-cookie';
import { BkperAuth } from '../src/bkper-auth';

describe('BkperAuth', () => {

    beforeEach(() => {
        vi.clearAllMocks();
        (globalThis.fetch as any).mockReset();
        (Cookies.get as any).mockReset();
        (Cookies.set as any).mockReset();
    });

    describe('constructor', () => {

        it('should initialize with default config', () => {
            const auth = new BkperAuth();
            expect(auth).toBeInstanceOf(BkperAuth);
        });

        it('should accept custom baseUrl', () => {
            const auth = new BkperAuth({ baseUrl: 'http://localhost:3000' });
            expect(auth).toBeInstanceOf(BkperAuth);
        });

    });

    describe('getAccessToken()', () => {

        it('should return undefined initially', () => {
            const auth = new BkperAuth();
            expect(auth.getAccessToken()).toBeUndefined();
        });

    });

    describe('hasLoggedInBefore()', () => {

        it('should return true when cookie exists', () => {
            (Cookies.get as any).mockReturnValue('true');
            const auth = new BkperAuth();
            expect(auth.hasLoggedInBefore()).toBe(true);
        });

        it('should return false when cookie does not exist', () => {
            (Cookies.get as any).mockReturnValue(undefined);
            const auth = new BkperAuth();
            expect(auth.hasLoggedInBefore()).toBe(false);
        });

    });

    describe('refresh()', () => {

        it('should set token and call onTokenRefresh on 200 response', async () => {

            const onTokenRefresh = vi.fn();
            const auth = new BkperAuth({ onTokenRefresh });

            (globalThis.fetch as any).mockResolvedValue({
                status: 200,
                json: () => Promise.resolve({ accessToken: 'test-token-123' }),
            });

            await auth.refresh();

            expect(auth.getAccessToken()).toBe('test-token-123');
            expect(onTokenRefresh).toHaveBeenCalledWith('test-token-123');
            expect(Cookies.set).toHaveBeenCalledWith('already-logged', 'true');
        });

        it('should clear token on 401 response', async () => {

            const auth = new BkperAuth();

            (globalThis.fetch as any).mockResolvedValue({
                status: 401,
            });

            await auth.refresh();

            expect(auth.getAccessToken()).toBeUndefined();
        });

        it('should reject and call onError on invalid response', async () => {

            const onError = vi.fn();
            const auth = new BkperAuth({ onError });

            (globalThis.fetch as any).mockResolvedValue({
                status: 200,
                json: () => Promise.resolve({ invalid: 'data' }),
            });

            await expect(auth.refresh()).rejects.toThrow('Invalid auth response');
            expect(onError).toHaveBeenCalled();
        });

        it('should reject and call onError on network failure', async () => {

            const onError = vi.fn();
            const auth = new BkperAuth({ onError });

            (globalThis.fetch as any).mockRejectedValue(new Error('Network error'));

            await expect(auth.refresh()).rejects.toThrow('Network error');
            expect(onError).toHaveBeenCalled();
            expect(auth.getAccessToken()).toBeUndefined();
        });

        it('should reject and call onError on non-200/401 status', async () => {

            const onError = vi.fn();
            const auth = new BkperAuth({ onError });

            (globalThis.fetch as any).mockResolvedValue({
                status: 500,
                statusText: 'Internal Server Error',
            });

            await expect(auth.refresh()).rejects.toThrow('Internal Server Error');
            expect(onError).toHaveBeenCalled();
        });

        it('should not call onTokenRefresh if token is invalid', async () => {

            const onTokenRefresh = vi.fn();
            const auth = new BkperAuth({ onTokenRefresh });

            (globalThis.fetch as any).mockResolvedValue({
                status: 200,
                json: () => Promise.resolve({ accessToken: '' }),
            });

            await expect(auth.refresh()).rejects.toThrow('Invalid auth response');
            expect(onTokenRefresh).not.toHaveBeenCalled();
        });

    });

    describe('init()', () => {

        it('should call onLoginSuccess after successful refresh', async () => {

            const onLoginSuccess = vi.fn();
            const auth = new BkperAuth({ onLoginSuccess });

            (globalThis.fetch as any).mockResolvedValue({
                status: 200,
                json: () => Promise.resolve({ accessToken: 'test-token' }),
            });

            await auth.init();

            expect(onLoginSuccess).toHaveBeenCalled();
        });

        it('should call onLoginRequired when refresh returns 401', async () => {

            const onLoginRequired = vi.fn();
            const auth = new BkperAuth({ onLoginRequired });

            (globalThis.fetch as any).mockResolvedValue({
                status: 401,
            });

            await auth.init();

            expect(onLoginRequired).toHaveBeenCalled();
        });

        it('should call onError when refresh fails', async () => {

            const onError = vi.fn();
            const auth = new BkperAuth({ onError });

            (globalThis.fetch as any).mockRejectedValue(new Error('Network error'));

            await auth.init();

            expect(onError).toHaveBeenCalled();
        });

    });

    describe('login()', () => {

        it('should redirect to login URL with returnUrl', () => {

            const auth = new BkperAuth();
            auth.login();

            expect(self.location.assign).toHaveBeenCalledWith(
                expect.stringContaining('https://bkper.app/auth/login?returnUrl=')
            );
        });

        it('should include additional auth params if provided', () => {

            const getAdditionalAuthParams = vi.fn().mockReturnValue({
                customToken: 'abc123'
            });
            const auth = new BkperAuth({ getAdditionalAuthParams });

            auth.login();

            expect(self.location.assign).toHaveBeenCalledWith(
                expect.stringContaining('customToken=abc123')
            );
        });

    });

    describe('logout()', () => {

        it('should call onLogout callback and redirect', () => {

            const onLogout = vi.fn();
            const auth = new BkperAuth({ onLogout });

            auth.logout();

            expect(onLogout).toHaveBeenCalled();
            expect(self.location.assign).toHaveBeenCalledWith(
                'https://bkper.app/auth/logout'
            );
        });

    });

});
