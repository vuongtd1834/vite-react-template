import { createFileRoute } from '@tanstack/react-router';

import SelectServicePage from '@/components/pages/select-service';

export const Route = createFileRoute('/_dashboard/_master-user/select-service')({
  component: SelectServicePage,
});
