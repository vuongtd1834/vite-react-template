import { createFileRoute } from '@tanstack/react-router';

import LoginPage from '@/components/pages/login';

export const Route = createFileRoute('/_before-auth/login')({
  component: LoginPage,
});
