import { Outlet } from '@tanstack/react-router';

export default function WithoutAuthTemplate() {
  return (
    <div>
      This is without auth template
      <hr />
      <Outlet />
    </div>
  );
}
