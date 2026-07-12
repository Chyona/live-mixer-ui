import type { BaseResponse } from './types';
import { request } from './http';

export type SourceVideoType = 'live' | 'import';

export type AsrStatus = 'pending' | 'processing' | 'success' | 'failed';

export interface SourceVideo {
  id: string;
  name: string;
  liveUrl: string;
  remarkName: string;
  duration: number;
  date: string;
  segmentCount: number;
  clipCount: number;
  sourceType: SourceVideoType;
  asrStatus: AsrStatus;
  asrProgress: number;
  asrMessage?: string;
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
  liveUrl: string;
  remarkName?: string;
  date: string;
  duration?: number;
}

export async function fetchSourceVideoList(
  params: SourceVideoListParams
): Promise<BaseResponse<SourceVideoListResult>> {
  return await request('/v1/source-videos', {
    method: 'get',
    params,
  });
}

export async function fetchSourceVideoDetail(id: string): Promise<BaseResponse<SourceVideo>> {
  return await request(`/v1/source-videos/${id}`, {
    method: 'get',
  });
}

export async function updateSourceVideoRemark(
  id: string,
  remarkName: string
): Promise<BaseResponse<SourceVideo>> {
  return await request(`/v1/source-videos/${id}/remark`, {
    method: 'put',
    data: { remarkName },
  });
}

export async function deleteSourceVideo(id: string): Promise<BaseResponse<null>> {
  return await request(`/v1/source-videos/${id}`, {
    method: 'delete',
  });
}

export async function createSourceVideo(
  params: CreateSourceVideoParams
): Promise<BaseResponse<SourceVideo>> {
  return await request('/v1/source-videos', {
    method: 'post',
    data: { ...params, sourceType: 'live' },
  });
}

export async function retrySourceVideoAsr(id: string): Promise<BaseResponse<SourceVideo>> {
  return await request(`/v1/source-videos/${id}/asr/retry`, {
    method: 'post',
  });
}
