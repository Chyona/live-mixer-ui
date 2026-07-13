import type { BaseResponse } from './types';
import { request } from './http';

export type AsrStatus = 'pending' | 'processing' | 'success' | 'failed';

export type SourceVideoAsrFields = Pick<
  SourceVideo,
  'asr_status' | 'asr_progress' | 'asr_error_msg' | 'asr_started_at' | 'asr_updated_at'
>;

export function createInitialAsrState(): SourceVideoAsrFields {
  return {
    asr_status: 'pending',
    asr_progress: 0,
    asr_error_msg: '',
    asr_started_at: '',
    asr_updated_at: '',
  };
}

export interface SourceVideo {
  id: number;
  name: string;
  live_url: string;
  remark: string;
  duration: number;
  ext: string;
  asr_status: AsrStatus;
  asr_progress: number;
  asr_error_msg: string;
  asr_started_at: string;
  asr_updated_at: string;
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
