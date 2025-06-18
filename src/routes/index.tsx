import { createFileRoute, redirect } from '@tanstack/react-router';

import HomePage from '@/components/pages/home';
import MainTemplate from '@/components/templates/main';
import { useUserStore } from '@/stores/user';

function Home() {
  return (
    <MainTemplate>
      <HomePage />
    </MainTemplate>
  );
}

export const Route = createFileRoute('/')({
  component: Home,
  beforeLoad: () => {
    const { user } = useUserStore.getState();
    const isAuthenticated = !!user;
    if (!isAuthenticated) {
      throw redirect({
        to: '/login',
      });
    }
  },
});
