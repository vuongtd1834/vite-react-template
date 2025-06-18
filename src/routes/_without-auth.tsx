import { createFileRoute } from '@tanstack/react-router';

import WithoutAuthTemplate from '@/components/templates/without-auth';

export const Route = createFileRoute('/_without-auth')({
  component: WithoutAuthTemplate,
});
