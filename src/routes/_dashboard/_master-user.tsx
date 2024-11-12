import { createFileRoute, redirect } from '@tanstack/react-router';

import { useUserStore } from '@/stores/user';

export const Route = createFileRoute('/_dashboard/_master-user')({
  beforeLoad: () => {
    const { user } = useUserStore.getState();
    const isMasterUser = user?.identifier?.userType === 'MASTER_USER';
    if (!isMasterUser) {
      throw redirect({
        to: '/403',
      });
    }
  },
});
