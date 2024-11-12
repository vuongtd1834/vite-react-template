import { Outlet } from '@tanstack/react-router';

export default function BeforeAuthTemplate() {
  return (
    <div>
      This is before auth template
      <hr />
      <Outlet />
    </div>
  );
}
