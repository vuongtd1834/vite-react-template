import { Outlet } from '@tanstack/react-router';

export default function DashboardTemplate() {
  return (
    <div>
      This is Dashboard Template
      <hr />
      <Outlet />
    </div>
  );
}
