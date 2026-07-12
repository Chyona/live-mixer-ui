import type { SliceProjectSource } from '~/services/sliceProject';

export type SliceEditorEntryFrom = 'source-videos' | 'slices' | 'tasks';

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

export function getSliceEditorEntryFrom(state: unknown): SliceEditorEntryFrom | undefined {
  return (state as { from?: SliceEditorEntryFrom } | null)?.from;
}
