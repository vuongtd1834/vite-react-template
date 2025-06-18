import { createFileRoute } from '@tanstack/react-router';

import AreasPage from '@/components/pages/areas';

export const Route = createFileRoute('/_dashboard/areas/')({
  component: AreasPage,
});
