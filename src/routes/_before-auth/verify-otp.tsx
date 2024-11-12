import { createFileRoute } from '@tanstack/react-router';

import OneTimePasswordPage from '@/components/pages/one-time-password';

export const Route = createFileRoute('/_before-auth/verify-otp')({
  component: OneTimePasswordPage,
});
