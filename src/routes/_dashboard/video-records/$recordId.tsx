import { createFileRoute } from '@tanstack/react-router';

import VideoRecordDetailPage from '@/components/pages/video-record-detail';

export const Route = createFileRoute('/_dashboard/video-records/$recordId')({
  component: VideoRecordDetailPage,
});
