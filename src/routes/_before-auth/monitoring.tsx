import { createFileRoute } from '@tanstack/react-router';

import MonitoringPage from '@/components/pages/monitoring';

export const Route = createFileRoute('/_before-auth/monitoring')({
  component: MonitoringPage,
});
