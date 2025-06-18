import { createFileRoute } from '@tanstack/react-router';

import NotificationTemplateDetailPage from '@/components/pages/notification-template-detail';

export const Route = createFileRoute('/_dashboard/notification-templates/$templateId')({
  component: NotificationTemplateDetailPage,
});
