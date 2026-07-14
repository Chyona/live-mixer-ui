import type { BaseResponse } from './types';
import { request } from './http';

export type {
  AsrStatus,
  SourceVideo,
  SourceVideoAsrFields,
} from './sourceVideo.model';
export { createInitialAsrState } from './sourceVideo.model';

import type { SourceVideo } from './sourceVideo.model';

export interface SourceVideoListParams {
  date?: string;
  dateEnd?: string;
  keyword?: string;
  globalKeyword?: string;
  page?: number;
  pageSize?: number;
}

export interface SourceVideoListResult {
  list: SourceVideo[];
  total: number;
}

export interface CreateSourceVideoParams {
  name: string;
  live_url: string;
  remark?: string;
}

export type SourceVideoId = number | string;

export async function fetchSourceVideoList(
  params: SourceVideoListParams
): Promise<BaseResponse<SourceVideoListResult>> {
  return await request('/v1/live-materials', {
    method: 'get',
    params,
  });
}

export async function fetchSourceVideoDetail(
  id: SourceVideoId
): Promise<BaseResponse<SourceVideo>> {
  return await request(`/v1/live-materials/${id}`, {
    method: 'get',
  });
}

/** 修改源视频名称或备注：接口要求 name、remark 两个字段都传 */
export async function updateSourceVideo(
  id: SourceVideoId,
  params: Partial<CreateSourceVideoParams>
): Promise<BaseResponse<SourceVideo>> {
  return await request(`/v1/live-materials/${id}`, {
    method: 'put',
    data: params,
  });
}

export async function deleteSourceVideo(id: SourceVideoId): Promise<BaseResponse<null>> {
  return await request(`/v1/live-materials/${id}`, {
    method: 'delete',
  });
}

export async function createSourceVideo(
  params: CreateSourceVideoParams
): Promise<BaseResponse<SourceVideo>> {
  return await request('/v1/live-materials', {
    method: 'post',
    data: params,
  });
}

export async function retrySourceVideoAsr(id: SourceVideoId): Promise<BaseResponse<SourceVideo>> {
  return await request(`/v1/live-materials/${id}/asr/retry`, {
    method: 'post',
  });
}
