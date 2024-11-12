import { type Register, RouterProvider } from '@tanstack/react-router';

import QueryProvider from '@/providers/query.provider';
import ThemeProvider from '@/providers/theme.provider';

type AppProps = { router: Register['router'] };

function App({ router }: AppProps) {
  return (
    <ThemeProvider>
      <QueryProvider>
        <RouterProvider router={router} />
        {/* TODO: add toast, global dialog, global loading, ..etc */}
      </QueryProvider>
    </ThemeProvider>
  );
}

export default App;
