import { createFileRoute } from '@tanstack/react-router';

import MonitoringPage from '@/components/pages/wrtc';

export const Route = createFileRoute('/_before-auth/wrtc')({
  component: MonitoringPage,
});
