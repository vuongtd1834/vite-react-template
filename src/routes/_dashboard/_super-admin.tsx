import { createFileRoute, redirect } from '@tanstack/react-router';

import { useUserStore } from '@/stores/user';

export const Route = createFileRoute('/_dashboard/_super-admin')({
  beforeLoad: () => {
    const { user } = useUserStore.getState();
    const isSuperAdmin = user?.identifier?.userType === 'SUPER_ADMIN';
    if (!isSuperAdmin) {
      throw redirect({
        to: '/403',
      });
    }
  },
});
