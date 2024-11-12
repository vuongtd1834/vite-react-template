import { createFileRoute, redirect } from '@tanstack/react-router';

import DashboardTemplate from '@/components/templates/dashboard';
import { useUserStore } from '@/stores/user';

export const Route = createFileRoute('/_dashboard')({
  beforeLoad: () => {
    const { user } = useUserStore.getState();
    const isAuthenticated = !!user;
    if (!isAuthenticated) {
      throw redirect({
        to: '/login',
      });
    }
  },
  component: DashboardTemplate,
});
