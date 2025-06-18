import { createFileRoute } from '@tanstack/react-router';

import NotificationTemplatesPage from '@/components/pages/notification-templates';

export const Route = createFileRoute('/_dashboard/notification-templates/')({
  component: NotificationTemplatesPage,
});
