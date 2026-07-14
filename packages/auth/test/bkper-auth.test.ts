import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BkperAuth } from '../src/bkper-auth';

describe('BkperAuth', () => {

    beforeEach(() => {
        vi.clearAllMocks();
        (globalThis.fetch as any).mockReset();
        self.location.href = 'http://localhost:3000/app';
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

        it('should coalesce concurrent refresh requests', async () => {
            const fetchMock = vi.mocked(globalThis.fetch);
            let resolveRefresh: ((response: Response) => void) | undefined;
            fetchMock.mockImplementationOnce(() => new Promise<Response>(resolve => {
                resolveRefresh = resolve;
            }));
            const auth = new BkperAuth();

            const firstRefresh = auth.refresh();
            const secondRefresh = auth.refresh();

            expect(fetchMock).toHaveBeenCalledTimes(1);
            resolveRefresh?.(Response.json({ accessToken: 'shared-token' }));
            await Promise.all([firstRefresh, secondRefresh]);
            expect(auth.getAccessToken()).toBe('shared-token');
        });

    });

    describe('authenticatedFetch()', () => {
        it('should refresh and retry once with the new bearer token', async () => {
            const fetchMock = vi.mocked(globalThis.fetch);
            const requestTokens: Array<string | null> = [];
            const requestBodies: string[] = [];
            fetchMock
                .mockResolvedValueOnce(Response.json({ accessToken: 'expired-token' }))
                .mockImplementationOnce(async input => {
                    const request = new Request(input);
                    requestTokens.push(request.headers.get('Authorization'));
                    requestBodies.push(await request.text());
                    return new Response(null, { status: 401 });
                })
                .mockResolvedValueOnce(Response.json({ accessToken: 'fresh-token' }))
                .mockImplementationOnce(async input => {
                    const request = new Request(input);
                    requestTokens.push(request.headers.get('Authorization'));
                    requestBodies.push(await request.text());
                    return Response.json({ ok: true });
                });
            const auth = new BkperAuth();
            await auth.refresh();

            const response = await auth.authenticatedFetch('http://localhost:3000/api/data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ value: 42 }),
            });

            expect(response.status).toBe(200);
            expect(requestTokens).toEqual(['Bearer expired-token', 'Bearer fresh-token']);
            expect(requestBodies).toEqual(['{"value":42}', '{"value":42}']);
            expect(fetchMock).toHaveBeenCalledTimes(4);
        });

        it('should return a second 401 without looping', async () => {
            const fetchMock = vi.mocked(globalThis.fetch);
            fetchMock
                .mockResolvedValueOnce(Response.json({ accessToken: 'expired-token' }))
                .mockResolvedValueOnce(new Response(null, { status: 401 }))
                .mockResolvedValueOnce(Response.json({ accessToken: 'fresh-token' }))
                .mockResolvedValueOnce(new Response(null, { status: 401 }));
            const auth = new BkperAuth();
            await auth.refresh();

            const response = await auth.authenticatedFetch('http://localhost:3000/api/data');

            expect(response.status).toBe(401);
            expect(fetchMock).toHaveBeenCalledTimes(4);
        });

        it('should not refresh or retry a 403 response', async () => {
            const fetchMock = vi.mocked(globalThis.fetch);
            fetchMock
                .mockResolvedValueOnce(Response.json({ accessToken: 'access-token' }))
                .mockResolvedValueOnce(new Response(null, { status: 403 }));
            const auth = new BkperAuth();
            await auth.refresh();

            const response = await auth.authenticatedFetch('http://localhost:3000/api/data');

            expect(response.status).toBe(403);
            expect(fetchMock).toHaveBeenCalledTimes(2);
        });

        it('should require login when the session cannot be refreshed', async () => {
            const fetchMock = vi.mocked(globalThis.fetch);
            const onLoginRequired = vi.fn();
            fetchMock
                .mockResolvedValueOnce(Response.json({ accessToken: 'expired-token' }))
                .mockResolvedValueOnce(new Response(null, { status: 401 }))
                .mockResolvedValueOnce(new Response(null, { status: 401 }));
            const auth = new BkperAuth({ onLoginRequired });
            await auth.refresh();

            await expect(
                auth.authenticatedFetch('http://localhost:3000/api/data')
            ).rejects.toThrow('Authentication required');
            expect(onLoginRequired).toHaveBeenCalledTimes(1);
            expect(fetchMock).toHaveBeenCalledTimes(3);
        });

        it('should require initialization before the first request', async () => {
            const fetchMock = vi.mocked(globalThis.fetch);
            const onLoginRequired = vi.fn();
            const auth = new BkperAuth({ onLoginRequired });

            await expect(
                auth.authenticatedFetch('http://localhost:3000/api/data')
            ).rejects.toThrow('Authentication required');
            expect(onLoginRequired).toHaveBeenCalledTimes(1);
            expect(fetchMock).not.toHaveBeenCalled();
        });

        it('should allow HTTPS requests to bkper.app subdomains', async () => {
            const fetchMock = vi.mocked(globalThis.fetch);
            fetchMock
                .mockResolvedValueOnce(Response.json({ accessToken: 'access-token' }))
                .mockResolvedValueOnce(Response.json({ ok: true }));
            self.location.href = 'https://my-app.bkper.app/app';
            const auth = new BkperAuth();
            await auth.refresh();

            const response = await auth.authenticatedFetch(
                'https://api.bkper.app/v5/resource'
            );

            expect(response.status).toBe(200);
            const request = new Request(fetchMock.mock.calls[1][0]);
            expect(request.headers.get('Authorization')).toBe('Bearer access-token');
        });

        it('should reject requests to origins outside bkper.app', async () => {
            const fetchMock = vi.mocked(globalThis.fetch);
            fetchMock.mockResolvedValueOnce(Response.json({ accessToken: 'access-token' }));
            self.location.href = 'https://my-app.bkper.app/app';
            const auth = new BkperAuth();
            await auth.refresh();

            await expect(
                auth.authenticatedFetch('https://example.test/resource')
            ).rejects.toThrow('Authenticated requests are restricted');
            expect(fetchMock).toHaveBeenCalledTimes(1);
        });

        it('should restrict local requests to the current origin', async () => {
            const fetchMock = vi.mocked(globalThis.fetch);
            fetchMock.mockResolvedValueOnce(Response.json({ accessToken: 'access-token' }));
            const auth = new BkperAuth();
            await auth.refresh();

            await expect(
                auth.authenticatedFetch('http://localhost:3001/resource')
            ).rejects.toThrow('Authenticated requests are restricted');
            expect(fetchMock).toHaveBeenCalledTimes(1);
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

            expect(onError).toHaveBeenCalledTimes(1);
        });

        it('should call onError when additional auth parameters fail', async () => {
            const error = new Error('Auth parameters failed');
            const onError = vi.fn();
            const auth = new BkperAuth({
                getAdditionalAuthParams: () => {
                    throw error;
                },
                onError,
            });

            await auth.init();

            expect(onError).toHaveBeenCalledOnce();
            expect(onError).toHaveBeenCalledWith(error);
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
