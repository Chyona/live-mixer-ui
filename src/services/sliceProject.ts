import type { SelectedCopySegment } from '~/pages/ManualVideoSlice/types';
import type { BaseResponse } from './types';
import { request } from './http';

export type SliceProjectSource = 'timeline' | 'manual';

/** 接口 clips 时间单位：毫秒 */
export interface SliceProjectClip {
  start_time: number;
  end_time: number;
  text?: string;
}


/** 新建剪辑项目请求体 */
export interface CreateSliceProjectParams {
  live_id: number;
  name: string;
  remark?: string;
  prompt_id?: number;
  /**
   * 项目来源：
   * - timeline：时间轴一键成片保存
   * - manual：人工切片保存
   */
  project_source: SliceProjectSource;
  clips0?: SliceProjectClip[];
  clips1?: SliceProjectClip[];
}

/** 更新剪辑项目请求体，均为可选 */
export type UpdateSliceProjectParams = Partial<CreateSliceProjectParams>;



export interface SliceProjectListParams {
  /** 关键词，英文逗号分隔，匹配 name/remark */
  keywords?: string;
  /** 开始日期 YYYY-MM-DD */
  start_date?: string;
  /** 结束日期 YYYY-MM-DD */
  end_date?: string;
  page?: number;
  page_size?: number;
}

/**
 * 剪辑项目（与接口返回结构一致）
 */
export type SliceProject = CreateSliceProjectParams & {
  id: number;
  live_name: string;
  created_by: string;
  draft_url: string;
  video_url: string;
  ext: string;
  created_at: string;
  updated_at: string;
};

/** 详情：在接口字段基础上，补充 UI 用 segments */
export interface SliceProjectDetail extends SliceProject {
  segments: SelectedCopySegment[];
}

export interface SliceProjectListResult {
  list: SliceProject[];
  total: number;
  page?: number;
  page_size?: number;
}

function pickDefinedParams<T extends object>(params: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined)
  ) as Partial<T>;
}

function clipsToUiSegments(
  clips: SliceProjectClip[] | undefined,
  prefix: string
): SelectedCopySegment[] {
  if (!clips?.length) return [];
  return clips.map((clip, index) => {
    const start = (clip.start_time ?? 0) / 1000;
    const end = (clip.end_time ?? 0) / 1000;
    return {
      id: `${prefix}-${index}-${Math.round(start * 1000)}-${Math.round(end * 1000)}`,
      speakerId: '1',
      speakerName: '',
      text: clip.text?.trim() ?? '',
      start,
      end,
    };
  });
}

export function getSliceProjectSource(project: {
  project_source?: SliceProjectSource;
  clips0?: SliceProjectClip[];
  clips1?: SliceProjectClip[];
}): SliceProjectSource {
  if (project.project_source === 'timeline' || project.project_source === 'manual') {
    return project.project_source;
  }
  const hasManual = (project.clips1?.length ?? 0) > 0;
  const hasTimeline = (project.clips0?.length ?? 0) > 0;
  if (hasManual && !hasTimeline) return 'manual';
  if (hasTimeline) return 'timeline';
  return 'manual';
}

/** 项目列表「片段数」统一取 clips1 */
export function getSliceProjectSegmentCount(
  project: Pick<SliceProject, 'clips1'>
): number {
  return project.clips1?.length ?? 0;
}

export function clipsToSliceSegments(
  project: Pick<SliceProject, 'clips0' | 'clips1'>
): SelectedCopySegment[] {
  // 文案预览 / 人工切片只使用 clips1；clips0 为时间轴选段，通常无 text
  return clipsToUiSegments(project.clips1, 'manual');
}

/** 规范化接口返回，补齐默认值 */
export function normalizeSliceProject(raw: Partial<SliceProject> | null | undefined): SliceProject {
  return {
    id: Number(raw?.id ?? 0),
    name: String(raw?.name ?? ''),
    live_id: Number(raw?.live_id ?? 0),
    live_name: String(raw?.live_name ?? ''),
    prompt_id: Number(raw?.prompt_id ?? 0),
    created_by: String(raw?.created_by ?? ''),
    created_at: String(raw?.created_at ?? ''),
    updated_at: String(raw?.updated_at ?? ''),
    remark: String(raw?.remark ?? ''),
    draft_url: String(raw?.draft_url ?? ''),
    video_url: String(raw?.video_url ?? ''),
    ext: String(raw?.ext ?? ''),
    clips0: Array.isArray(raw?.clips0) ? raw.clips0 : [],
    clips1: Array.isArray(raw?.clips1) ? raw.clips1 : [],
    project_source: getSliceProjectSource({
      project_source: raw?.project_source,
      clips0: Array.isArray(raw?.clips0) ? raw.clips0 : [],
      clips1: Array.isArray(raw?.clips1) ? raw.clips1 : [],
    }),
  };
}

function normalizeSliceProjectDetail(
  raw: Partial<SliceProject> | null | undefined
): SliceProjectDetail {
  const project = normalizeSliceProject(raw);
  return {
    ...project,
    segments: clipsToSliceSegments(project),
  };
}

/** 内部秒级片段 → 接口毫秒级 clips */
export function toSliceProjectClips(
  segments: Array<{ start: number; end: number; text?: string }>
): SliceProjectClip[] {
  return segments.map((segment) => ({
    start_time: Math.round(segment.start * 1000),
    end_time: Math.round(segment.end * 1000),
    text: segment.text?.trim() || undefined,
  }));
}

export async function fetchSliceProjectList(
  params?: SliceProjectListParams
): Promise<BaseResponse<SliceProjectListResult>> {
  const response = await request<BaseResponse<SliceProjectListResult>>('/v1/video-projects', {
    method: 'get',
    params,
  });

  return {
    ...response,
    data: {
      list: (response.data?.list ?? []).map(normalizeSliceProject),
      total: Number(response.data?.total ?? 0),
      page: response.data?.page,
      page_size: response.data?.page_size,
    },
  };
}

/** 按项目 id 拉详情 */
export async function fetchSliceProjectDetail(
  projectId: string | number
): Promise<BaseResponse<SliceProjectDetail>> {
  const response = await request<BaseResponse<SliceProject>>(`/v1/video-projects/${projectId}`, {
    method: 'get',
  });

  return {
    ...response,
    data: normalizeSliceProjectDetail(response.data),
  };
}

/**
 * 新建剪辑项目（无项目 id）。
 * POST /v1/video-projects
 */
export async function saveSliceProject(
  params: CreateSliceProjectParams
): Promise<BaseResponse<SliceProjectDetail>> {
  const response = await request<BaseResponse<SliceProject>>('/v1/video-projects', {
    method: 'post',
    data: params,
  });

  return {
    ...response,
    data: normalizeSliceProjectDetail(response.data),
  };
}

/**
 * 更新已有剪辑项目（有项目 id）。
 * PUT /v1/video-projects/:id — 仅提交传入的字段。
 */
export async function updateSliceProject(
  projectId: string | number,
  params: UpdateSliceProjectParams
): Promise<BaseResponse<SliceProjectDetail>> {
  const response = await request<BaseResponse<SliceProject>>(`/v1/video-projects/${projectId}`, {
    method: 'put',
    data: pickDefinedParams(params),
  });

  return {
    ...response,
    data: normalizeSliceProjectDetail(response.data),
  };
}

/** 按项目 id 更新名称 */
export async function updateSliceProjectName(
  projectId: string | number,
  name: string
): Promise<BaseResponse<SliceProject>> {
  const response = await request<BaseResponse<SliceProject>>(`/v1/video-projects/${projectId}/name`, {
    method: 'put',
    data: { name },
  });

  return {
    ...response,
    data: normalizeSliceProject(response.data),
  };
}

/** 按项目 id 删除 */
export async function deleteSliceProject(
  projectId: string | number
): Promise<BaseResponse<null>> {
  return await request(`/v1/video-projects/${projectId}`, {
    method: 'delete',
  });
}
