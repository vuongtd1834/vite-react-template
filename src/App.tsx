import { type Register, RouterProvider } from '@tanstack/react-router';

import QueryProvider from '@/providers/query.provider';

type AppProps = { router: Register['router'] };

function App({ router }: AppProps) {
  return (
    <QueryProvider>
      <RouterProvider router={router} />
      {/* TODO: add toast, global dialog, global loading, ..etc */}
    </QueryProvider>
  );
}

export default App;
