export {};

declare global {
  type ValueOf<T> = T[keyof T];

  interface ExtendedPromise<T> extends Promise<T> {
    cancel?: () => void;
  }

  // FIXME: fix response error matching with backend
  type TBaseError =
    | {
        error: string;
        statusCode: 400;
        message:
          | Array<{
              property: string;
              message: string;
            }>
          | Array<string>;
        errorCode?: string;
      }
    | {
        error: string;
        statusCode: 401 | 403 | 404 | 500;
        message: Array<string>;
        errorCode?: string;
      };

  // FIXME: fix response data matching with backend
  type TBasePaginationResponse<T> = {
    totalDocs: number;
    totalPages: number;
    limit: number;
    page: number;
    docs: Array<T & { v: number }>;
  };

  type TBaseRequest =
    | {
        page?: number;
        limit?: number;
      }
    | Record<string, string>;
}
