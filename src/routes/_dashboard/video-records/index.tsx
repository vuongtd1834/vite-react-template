import { createFileRoute } from '@tanstack/react-router';

import VideoRecordsPage from '@/components/pages/video-records';

export const Route = createFileRoute('/_dashboard/video-records/')({
  component: VideoRecordsPage,
});
