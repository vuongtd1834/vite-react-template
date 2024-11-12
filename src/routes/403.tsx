import { createFileRoute } from '@tanstack/react-router';

import AccessDenied from '@/components/pages/access-denied';

export const Route = createFileRoute('/403')({
  component: AccessDenied,
});
