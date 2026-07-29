import type { SliceProjectSource } from '~/services/sliceProject';

export type SliceEditorEntryFrom = 'source-videos' | 'slices' | 'tasks';
/** @deprecated 统一切片页后不再区分工作区模式，保留类型供旧链接兼容 */
export type SliceEditorMode = 'timeline' | 'manual';

export const LIVE_SLICE_PATH = '/videos-slice';
/** @deprecated 已并入 /videos-slice，保留常量供旧链接兼容 */
export const VIDEOS_MANUAL_SLICE_PATH = '/videos-manual-slice';

export type SliceEditorLinkOptions = {
  /** 切片项目 id；从项目管理进入编辑时必传 */
  projectId?: string | number | null;
  /** @deprecated 统一页后忽略 */
  mode?: SliceEditorMode | null;
};

/** @deprecated 统一页后恒为 timeline 占位，仅兼容旧调用 */
export function parseSliceEditorMode(value: string | null | undefined): SliceEditorMode {
  return value === 'manual' ? 'manual' : 'timeline';
}

function appendSliceSearch(path: string, options?: SliceEditorLinkOptions) {
  const search = new URLSearchParams();
  const projectId = options?.projectId;
  if (projectId != null && projectId !== '') {
    search.set('projectId', String(projectId));
  }
  const qs = search.toString();
  return qs ? `${path}?${qs}` : path;
}

/** 统一切片页链接 */
export function buildVideoSliceLink(
  sourceVideoId: string,
  options?: SliceEditorLinkOptions
) {
  return appendSliceSearch(`${LIVE_SLICE_PATH}/${sourceVideoId}`, options);
}

export function buildSourceVideoSliceLink(
  sourceVideoId: string,
  options?: SliceEditorLinkOptions
) {
  return buildVideoSliceLink(sourceVideoId, options);
}

export function buildManualVideoSliceLink(
  sourceVideoId: string,
  options?: SliceEditorLinkOptions
) {
  return buildVideoSliceLink(sourceVideoId, options);
}

export function buildSliceProjectEditLink(params: {
  /** 源视频 id（路径参数） */
  liveId: string | number;
  /** 剪辑项目 id（查询参数 projectId） */
  id: string | number;
  projectSource?: SliceProjectSource;
}) {
  const { liveId, id } = params;
  return buildVideoSliceLink(String(liveId), { projectId: id });
}

export function getSliceEditorEntryFrom(state: unknown): SliceEditorEntryFrom | undefined {
  return (state as { from?: SliceEditorEntryFrom } | null)?.from;
}

/** 解析 URL query 中的 projectId（正整数）；非法则返回 null */
export function parseProjectId(value: string | null | undefined): number | null {
  if (value == null || value.trim() === '') return null;
  const id = Number(value.trim());
  return Number.isInteger(id) && id > 0 ? id : null;
}
