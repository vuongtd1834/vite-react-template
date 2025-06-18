import { createFileRoute } from '@tanstack/react-router';

import CamerasPage from '@/components/pages/cameras';

export const Route = createFileRoute('/_dashboard/cameras/')({
  component: CamerasPage,
});
