import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

import { instance, instanceWithoutInterceptors } from '@/libs/axios';

export interface Options<T> extends AxiosRequestConfig {
  select?: (res: AxiosResponse) => T | Promise<T>;
  url: string;
}

export type HelperOptions<T> = Omit<Options<T>, 'url' | 'method'>;

const filterEmptyString = (params: Record<string, unknown>) => {
  const result: Record<string, unknown> = {};

  Object.entries(params).forEach(([key, value]) => {
    if (value !== '') {
      result[key] = value;
    }
  });

  return result;
};

const httpClient =
  (axiosInstance: AxiosInstance) =>
  <T>({ select = (res) => res.data, params = {}, ...config }: Options<T>) => {
    const requestPromise: ExtendedPromise<T> = new Promise<T>((fulfill, reject) => {
      axiosInstance({
        params: params instanceof URLSearchParams ? params : filterEmptyString(params),
        ...config,
      })
        .then(select)
        .then(fulfill)
        .catch(reject);
    });
    return requestPromise;
  };

const httpClientFactory = (axiosInstance: AxiosInstance) => {
  const callback = httpClient(axiosInstance);
  return {
    get: <T>(url: string, options: HelperOptions<T> = {}) => callback<T>({ url, ...options }),
    post: <T, P>(url: string, data?: P, options: HelperOptions<T> = {}) =>
      callback<T>({ url, data, method: 'post', ...options }),
    put: <T, P>(url: string, data?: P, options: HelperOptions<T> = {}) =>
      callback<T>({ url, data, method: 'put', ...options }),
    patch: <T, P>(url: string, data?: P, options: HelperOptions<T> = {}) =>
      callback<T>({ url, data, method: 'patch', ...options }),
    delete: <T>(url: string, options: HelperOptions<T> = {}) =>
      callback<T>({ url, method: 'delete', ...options }),
  };
};

const apiWithAuth = httpClientFactory(instance);

const apiWithOutAuth = httpClientFactory(instanceWithoutInterceptors);

export { apiWithAuth, apiWithOutAuth };
