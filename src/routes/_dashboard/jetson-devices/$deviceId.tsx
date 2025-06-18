import { createFileRoute } from '@tanstack/react-router';

import JetsonDeviceDetailPage from '@/components/pages/jetson-device-detail';

export const Route = createFileRoute('/_dashboard/jetson-devices/$deviceId')({
  component: JetsonDeviceDetailPage,
});
