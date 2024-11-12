import type { AxiosError, CreateAxiosDefaults, InternalAxiosRequestConfig } from 'axios';
import axios from 'axios';

import { useUserStore } from '@/stores/user';

interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

let refreshTokenPromise: Promise<string> | false = false;

const baseConfig: CreateAxiosDefaults = {
  baseURL: `${import.meta.env.VITE_API_URL}`,
};

export const instanceWithoutInterceptors = axios.create(baseConfig);

export const instance = axios.create(baseConfig);

instance.interceptors.request.use(
  (config) => {
    const accessToken = useUserStore.getState().user?.accessToken;

    if (accessToken && config && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

instance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    // FIXME: remove if app does not use refresh token
    const originalRequest: CustomAxiosRequestConfig | undefined = error.config;

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;

      if (!refreshTokenPromise) {
        // Start a new refresh token request
        const refreshToken = useUserStore.getState().user?.refreshToken;

        refreshTokenPromise = instanceWithoutInterceptors
          .post<AuthModel.TAuthenticationResponse>('/api/v1/auth/refresh-token', { refreshToken })
          .then((response) => {
            useUserStore.getState().setCredentials(response.data);
            return response.data.accessToken;
          })
          .catch((err) => {
            useUserStore.getState().removeCredentials();
            return Promise.reject(err);
          })
          .finally(() => {
            refreshTokenPromise = false; // Reset after completion
          });
      }

      // Wait for the refresh token request to complete
      const accessToken = await refreshTokenPromise;
      originalRequest.headers.Authorization = `Bearer ${accessToken}`;

      return instance(originalRequest);
    }

    return Promise.reject(error);
  }
);
