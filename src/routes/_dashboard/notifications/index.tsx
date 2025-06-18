import { createFileRoute } from '@tanstack/react-router';

import NotificationsPage from '@/components/pages/notifications';

export const Route = createFileRoute('/_dashboard/notifications/')({
  component: NotificationsPage,
});
