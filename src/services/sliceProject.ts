import type { SelectedCopySegment } from '~/pages/ManualVideoSlice/types';
import type { BaseResponse } from './types';
import { request } from './http';

export type SliceProjectSource = 'timeline' | 'manual';

export interface SliceProject {
  id: string;
  sourceVideoId: string;
  sourceVideoName: string;
  remarkName: string;
  projectName: string;
  projectSource: SliceProjectSource;
  segmentCount: number;
  updatedAt: string;
  segments?: SelectedCopySegment[];
}

export interface SliceProjectDetail extends SliceProject {
  segments: SelectedCopySegment[];
}

/** 接口 clips 时间单位：毫秒 */
export interface SliceProjectClip {
  start_time: number;
  end_time: number;
}

/** 新建剪辑项目请求体 */
export interface CreateSliceProjectParams {
  /** 源视频 id */
  live_id: number;
  /** 项目名称 */
  name: string;
  /** 项目备注 */
  remark?: string;
  /** 时间选片片段 */
  clips0?: SliceProjectClip[];
  /** 人工选片片段 */
  clips1?: SliceProjectClip[];
}

/**
 * 更新剪辑项目请求体（时间单位 ms）。
 * 均为可选：传了哪个字段就只更新哪个。
 */
export interface UpdateSliceProjectParams {
  live_id?: number;
  name?: string;
  remark?: string;
  clips0?: SliceProjectClip[];
  clips1?: SliceProjectClip[];
}

function pickDefinedParams<T extends object>(params: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined)
  ) as Partial<T>;
}

export interface SliceProjectListParams {
  date?: string;
  dateEnd?: string;
  keyword?: string;
  page?: number;
  pageSize?: number;
}

export interface SliceProjectListResult {
  list: SliceProject[];
  total: number;
}

/** 内部秒级片段 → 接口毫秒级 clips */
export function toSliceProjectClips(
  segments: Array<{ start: number; end: number }>
): SliceProjectClip[] {
  return segments.map((segment) => ({
    start_time: Math.round(segment.start * 1000),
    end_time: Math.round(segment.end * 1000),
  }));
}

export async function fetchSliceProjectList(
  params?: SliceProjectListParams
): Promise<BaseResponse<SliceProjectListResult>> {
  return await request('/v1/video-projects', {
    method: 'get',
    params,
  });
}

/** 按项目 id 拉详情 */
export async function fetchSliceProjectDetail(
  projectId: string
): Promise<BaseResponse<SliceProjectDetail>> {
  return await request(`/v1/video-projects/${projectId}`, {
    method: 'get',
  });
}

/**
 * 新建剪辑项目（无项目 id）。
 * POST /v1/video-projects
 */
export async function saveSliceProject(
  params: CreateSliceProjectParams
): Promise<BaseResponse<SliceProjectDetail>> {
  return await request('/v1/video-projects', {
    method: 'post',
    data: {
      live_id: params.live_id,
      name: params.name,
      remark: params.remark ?? '',
      clips0: params.clips0 ?? [],
      clips1: params.clips1 ?? [],
    },
  });
}

/**
 * 更新已有剪辑项目（有项目 id）。
 * PUT /v1/video-projects/:id — 仅提交传入的字段。
 */
export async function updateSliceProject(
  projectId: string,
  params: UpdateSliceProjectParams
): Promise<BaseResponse<SliceProjectDetail>> {
  return await request(`/v1/video-projects/${projectId}`, {
    method: 'put',
    data: pickDefinedParams(params),
  });
}

/** 按项目 id 更新名称 */
export async function updateSliceProjectName(
  projectId: string,
  projectName: string
): Promise<BaseResponse<SliceProject>> {
  return await request(`/v1/video-projects/${projectId}/name`, {
    method: 'put',
    data: { projectName },
  });
}
