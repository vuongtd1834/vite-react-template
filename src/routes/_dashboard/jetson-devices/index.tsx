import { createFileRoute } from '@tanstack/react-router';

import JetsonDevicesPage from '@/components/pages/jetson-devices';

export const Route = createFileRoute('/_dashboard/jetson-devices/')({
  component: JetsonDevicesPage,
});
