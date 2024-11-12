import { createFileRoute } from '@tanstack/react-router';

import ForgotPasswordPage from '@/components/pages/forgot-password';

export const Route = createFileRoute('/_before-auth/forgot-password')({
  component: ForgotPasswordPage,
});
