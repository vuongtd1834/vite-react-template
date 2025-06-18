import { createFileRoute } from '@tanstack/react-router';

import CameraDetailPage from '@/components/pages/camera-detail';

export const Route = createFileRoute('/_dashboard/cameras/$cameraId')({
  component: CameraDetailPage,
});
