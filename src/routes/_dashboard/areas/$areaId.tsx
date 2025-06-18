import { createFileRoute } from '@tanstack/react-router';

import AreaDetailPage from '@/components/pages/area-detail';

export const Route = createFileRoute('/_dashboard/areas/$areaId')({
  component: AreaDetailPage,
});
