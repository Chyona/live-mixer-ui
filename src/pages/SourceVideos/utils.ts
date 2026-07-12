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

export type ManualSliceEntryFrom = 'source-videos' | 'slices' | 'tasks';

export type SliceProjectSource = 'timeline' | 'manual';

export function buildSourceVideoSliceLink(sourceVideoId: string) {
  return `/source-videos/${sourceVideoId}/slice`;
}

export function buildManualVideoSliceLink(sourceVideoId: string) {
  return `/source-videos/${sourceVideoId}/manual-slice`;
}

export function buildSliceProjectEditLink(
  sourceVideoId: string,
  projectSource: SliceProjectSource = 'manual'
) {
  return projectSource === 'timeline'
    ? buildSourceVideoSliceLink(sourceVideoId)
    : buildManualVideoSliceLink(sourceVideoId);
}

export function isPlayableStreamUrl(url: string) {
  return /\.(mp4|m3u8|webm|ogg|mov|m4v|flv|avi|mkv)(\?|$)/i.test(url) || /^https?:\/\//i.test(url.trim());
}

