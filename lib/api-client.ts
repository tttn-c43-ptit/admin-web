import ky from 'ky';
import { getAccessToken, getRefreshToken, setAccessToken, setRefreshToken, clearTokens } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const apiClient = ky.create({
  prefix: API_URL,
  hooks: {
    beforeRequest: [
      ({ request }) => {
        const token = getAccessToken();
        if (token) {
          request.headers.set('Authorization', `Bearer ${token}`);
        }
      }
    ],
    afterResponse: [
      async ({ request, response }) => {
        if (response.status === 401) {
          // Do not attempt refresh loop on login or refresh endpoints
          if (request.url.includes('/api/auth/login') || request.url.includes('/api/auth/refresh')) {
            return;
          }

          const refreshToken = getRefreshToken();
          if (refreshToken) {
            try {
              const { access_token, refresh_token } = await ky.post(`${API_URL}/api/auth/refresh`, {
                json: { refresh_token: refreshToken }
              }).json<{ access_token: string; refresh_token: string }>();

              setAccessToken(access_token);
              if (refresh_token) setRefreshToken(refresh_token);

              const newHeaders = new Headers(request.headers);
              newHeaders.set('Authorization', `Bearer ${access_token}`);
              return ky(request.url, {
                headers: newHeaders,
                method: request.method,
              });
            } catch {
              clearTokens();
              if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
                window.location.href = '/login';
              }
            }
          } else {
            clearTokens();
            if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
              window.location.href = '/login';
            }
          }
        }
      }
    ]
  }
});
