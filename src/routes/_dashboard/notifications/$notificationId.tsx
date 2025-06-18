import { createFileRoute } from '@tanstack/react-router';

import NotificationDetailPage from '@/components/pages/notification-detail';

export const Route = createFileRoute('/_dashboard/notifications/$notificationId')({
  component: NotificationDetailPage,
});
