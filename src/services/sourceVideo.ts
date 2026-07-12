import type { BaseResponse } from './types';
import { request } from './http';

export type AsrStatus = 'pending' | 'processing' | 'success' | 'failed';

export interface SourceVideo {
  id: number;
  name: string;
  live_url: string;
  remark: string;
  duration: number;
  ext: string;
  live_asr: string;
  asr_status: AsrStatus;
  asr_progress: number;
  created_at: string;
  updated_at: string;
  created_by: number;
}

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

export async function updateSourceVideoRemark(
  id: SourceVideoId,
  remark: string
): Promise<BaseResponse<SourceVideo>> {
  return await request(`/v1/live-materials/${id}/remark`, {
    method: 'put',
    data: { remark },
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
