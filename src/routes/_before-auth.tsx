import { createFileRoute } from '@tanstack/react-router';

import BeforeAuthTemplate from '@/components/templates/before-auth';

export const Route = createFileRoute('/_before-auth')({
  component: BeforeAuthTemplate,
});
