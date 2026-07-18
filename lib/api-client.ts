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
          const refreshToken = getRefreshToken();
          if (refreshToken) {
            try {
              // Note: the backend route for refreshing token depends on the actual API structure
              // Assuming it's POST /api/auth/refresh as suggested
              const { access_token, refresh_token } = await ky.post(`${API_URL}/api/auth/refresh`, {
                json: { refresh_token: refreshToken }
              }).json<{ access_token: string; refresh_token: string }>();

              setAccessToken(access_token);
              if (refresh_token) setRefreshToken(refresh_token);

              // Retry the original request
              request.headers.set('Authorization', `Bearer ${access_token}`);
              return ky(request);
            } catch {
              // Refresh failed, clear tokens and redirect to login
              clearTokens();
              if (typeof window !== 'undefined') {
                window.location.href = '/login';
              }
            }
          } else {
            clearTokens();
            if (typeof window !== 'undefined') {
              window.location.href = '/login';
            }
          }
        }
      }
    ]
  }
});
