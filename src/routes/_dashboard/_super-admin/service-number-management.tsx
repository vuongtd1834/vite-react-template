import { createFileRoute } from '@tanstack/react-router';

import ServiceNumberManagementPage from '@/components/pages/service-number-management';

export const Route = createFileRoute('/_dashboard/_super-admin/service-number-management')({
  component: ServiceNumberManagementPage,
});
