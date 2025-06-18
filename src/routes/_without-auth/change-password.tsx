import { createFileRoute } from '@tanstack/react-router';

import ChangePasswordPage from '@/components/pages/change-password';

export const Route = createFileRoute('/_without-auth/change-password')({
  component: ChangePasswordPage,
});
