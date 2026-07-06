import type { Dayjs } from 'dayjs';

export function formatVideoDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

export function buildDateRange(dateRange: [Dayjs | null, Dayjs | null] | null) {
  if (!dateRange?.[0]) {
    return { date: undefined, dateEnd: undefined };
  }

  return {
    date: dateRange[0].format('YYYY-MM-DD'),
    dateEnd: (dateRange[1] ?? dateRange[0]).format('YYYY-MM-DD'),
  };
}

export function buildSourceVideoSliceLink(sourceVideoId: string) {
  return `/source-videos/${sourceVideoId}/slice`;
}

