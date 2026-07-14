import type { SliceProjectSource } from '~/services/sliceProject';

export type SliceEditorEntryFrom = 'source-videos' | 'slices' | 'tasks';

export const LIVE_SLICE_PATH = '/videos-slice';
export const VIDEOS_MANUAL_SLICE_PATH = '/videos-manual-slice';

export type SliceEditorLinkOptions = {
  /** 切片项目 id；从项目管理进入编辑时必传 */
  projectId?: string | number | null;
};

function appendProjectId(path: string, options?: SliceEditorLinkOptions) {
  const projectId = options?.projectId;
  if (projectId == null || projectId === '') return path;
  const search = new URLSearchParams({ projectId: String(projectId) });
  return `${path}?${search.toString()}`;
}

export function buildSourceVideoSliceLink(
  sourceVideoId: string,
  options?: SliceEditorLinkOptions
) {
  return appendProjectId(`${LIVE_SLICE_PATH}/${sourceVideoId}`, options);
}

export function buildManualVideoSliceLink(
  sourceVideoId: string,
  options?: SliceEditorLinkOptions
) {
  return appendProjectId(`${VIDEOS_MANUAL_SLICE_PATH}/${sourceVideoId}`, options);
}

export function buildSliceProjectEditLink(
  sourceVideoId: string,
  projectSource: SliceProjectSource = 'manual',
  projectId?: string | number | null
) {
  const options = { projectId };
  return projectSource === 'timeline'
    ? buildSourceVideoSliceLink(sourceVideoId, options)
    : buildManualVideoSliceLink(sourceVideoId, options);
}

export function getSliceEditorEntryFrom(state: unknown): SliceEditorEntryFrom | undefined {
  return (state as { from?: SliceEditorEntryFrom } | null)?.from;
}
