import {
  type DefaultError,
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import axios from 'axios';
import React, { useCallback } from 'react';

export default function QueryProvider({ children }: React.PropsWithChildren) {
  const handleGlobalError = useCallback((error: DefaultError) => {
    if (!axios.isAxiosError(error) || !error.response?.status) {
      return;
    }

    const { status } = error.response;

    // FIXME: change status number to enum, constant ...etc
    if (status >= 500 && status < 600) {
      // TODO: show internal server error
      return;
    }

    if (status === 400) {
      // TODO: maybe show some error special, which is not mapping to the form
      return;
    }

    switch (status) {
      case 403:
        // TODO: show error or redirect to access denied page
        break;
      case 404:
        // TODO: show error or redirect to not found page, etc
        break;
      default:
        break;
    }
  }, []);

  const [client] = React.useState(
    new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 5000,
          retry: 3,
          retryDelay: 1000,
          refetchOnWindowFocus: false,
          retryOnMount: false,
        },
      },
      queryCache: new QueryCache({
        onError: handleGlobalError,
      }),
      mutationCache: new MutationCache({
        onError: handleGlobalError,
      }),
    })
  );
  return (
    <QueryClientProvider client={client}>
      {children}
      <ReactQueryDevtools buttonPosition="bottom-left" initialIsOpen={false} />
    </QueryClientProvider>
  );
}
