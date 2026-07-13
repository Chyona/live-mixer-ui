import type { SliceProjectSource } from '~/services/sliceProject';

export type SliceEditorEntryFrom = 'source-videos' | 'slices' | 'tasks';

export const LIVE_SLICE_PATH = '/videos-slice';
export const VIDEOS_MANUAL_SLICE_PATH = '/videos-manual-slice';

export function buildSourceVideoSliceLink(sourceVideoId: string) {
  return `${LIVE_SLICE_PATH}/${sourceVideoId}`;
}

export function buildManualVideoSliceLink(sourceVideoId: string) {
  return `${VIDEOS_MANUAL_SLICE_PATH}/${sourceVideoId}`;
}

export function buildSliceProjectEditLink(
  sourceVideoId: string,
  projectSource: SliceProjectSource = 'manual'
) {
  return projectSource === 'timeline'
    ? buildSourceVideoSliceLink(sourceVideoId)
    : buildManualVideoSliceLink(sourceVideoId);
}

export function getSliceEditorEntryFrom(state: unknown): SliceEditorEntryFrom | undefined {
  return (state as { from?: SliceEditorEntryFrom } | null)?.from;
}
