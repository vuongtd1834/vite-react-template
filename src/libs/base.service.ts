import { apiWithAuth } from '@/utils/api';

/**
 * This class is used to create a base service for crud operations Restful APIs
 *
 * @param T - Type of the data you are fetching
 * @param K - Primary key of the data
 * @param TBody - Type of the data you are sending
 * @param O - Optional keys of the data you are sending
 *
 * @example
 * Example usage of the base service for normal crud operations
 * ```ts
 * import { BaseService } from '@/libs/base.service';
 *
 * export class SettingService extends BaseService<SettingModel.Setting, 'id', SettingModel.RequestBody> {
 *  constructor() {
 *   super('/api/v1/settings', 'id');
 * }
 * ```
 * @example
 * Example use of the base service with additional function
 * ```ts
 * import { BaseService } from '@/libs/base.service';
 * import { apiWithAuth } from '@/utils/api';
 *
 * export class SettingService extends BaseService<any> {
 *  constructor() {
 *    super('/api/v1/settings', 'id');
 *  }
 *
 *  async exportSetting() {
 *   return apiWithAuth.get(`${this.baseUrl}/export`, { responseType: 'blob' });
 *  }
 * }
 * ```
 * @example
 * How to use
 * ```ts
 * import { SettingService } from '@/services/settings';
 * const settingService = new SettingService();
 *
 * // FETCH
 * settingService.fetchAll(params, ...etc);
 *
 * // UPDATE
 * settingService.update({ id: '1', ...etc });
 *
 * // ...etc
 * ```
 * @example
 * How to use in query or mutation of `@tanstack/react-query`
 * ```ts
 * import { useMutation } from '@tanstack/react-query';
 * import { SettingService } from '@/services/settings';
 *
 * export function useFetchSetting(params?: TBaseRequest) {
 *  return useQuery({
 *    queryKey: ['setting', params],
 *    queryFn: async ({ signal }) => {
 *      const settingService = new SettingService();
 *      return settingService.fetchAll(params, signal);
 *    },
 * })
 *
 * export function useUpdateSetting() {
 *  return useMutation({
 *    mutationFn: async (payload) => {
 *     const settingService = new SettingService();
 *     return settingService.update(payload);
 *   }
 * }
 *
 * // ..etc
 */
export abstract class BaseService<
  T,
  K extends keyof T = keyof T,
  TBody = T,
  O extends keyof (T | TBody) = never,
> {
  // Base URL of the service
  protected baseUrl: string;

  // Primary key of the data
  private readonly primaryKey: K;

  public constructor(baseUrl: string, primaryKey: K) {
    this.baseUrl = baseUrl;
    this.primaryKey = primaryKey;
  }

  public fetchAll<R>(params?: R, signal?: AbortSignal) {
    return apiWithAuth.get<TBasePaginationResponse<T>>(`${this.baseUrl}`, { params, signal });
  }

  public getById(id: string, signal?: AbortSignal) {
    return apiWithAuth.get<T>(`${this.baseUrl}/${id}`, { signal });
  }

  public create<OmitKeys extends keyof (T | TBody) = O>(
    payload: Omit<TBody extends object ? TBody : T, OmitKeys>
  ) {
    return apiWithAuth.post<
      TBody extends object ? TBody : T,
      Omit<TBody extends object ? TBody : T, OmitKeys>
    >(this.baseUrl, payload);
  }

  public update<OmitKeys extends keyof (T | TBody) = O>(
    payload: Omit<TBody extends object ? TBody : T, OmitKeys>
  ) {
    const id =
      payload[this.primaryKey as unknown as keyof Omit<TBody extends object ? TBody : T, OmitKeys>];
    const newPayload = { ...payload };

    // Remove primary key from payload
    delete newPayload[
      this.primaryKey as unknown as keyof Omit<TBody extends object ? TBody : T, OmitKeys>
    ];

    return apiWithAuth.patch<
      TBody extends object ? TBody : T,
      Omit<TBody extends object ? TBody : T, OmitKeys>
    >(`${this.baseUrl}/${id}`, newPayload);
  }

  public updatePut<OmitKeys extends keyof (T | TBody) = O>(
    payload: Omit<TBody extends object ? TBody : T, OmitKeys>
  ) {
    const id =
      payload[this.primaryKey as unknown as keyof Omit<TBody extends object ? TBody : T, OmitKeys>];

    const newPayload = { ...payload };

    // Remove primary key from payload
    delete newPayload[
      this.primaryKey as unknown as keyof Omit<TBody extends object ? TBody : T, OmitKeys>
    ];

    return apiWithAuth.put<
      TBody extends object ? TBody : T,
      Omit<TBody extends object ? TBody : T, OmitKeys>
    >(`${this.baseUrl}/${id}`, newPayload);
  }

  public delete(id: string) {
    return apiWithAuth.delete(`${this.baseUrl}/${id}`);
  }
}
