import type { BaseResponse } from './types';
import { request } from './http';

export type SliceAuditStatus = 'approved' | 'rejected' | 'pending';

export interface VideoSliceItem {
  id: string;
  name: string;
  startTime: number;
  endTime: number;
  duration: number;
  date: string;
  sourceVideoId: string;
  sourceVideoName: string;
  sourceVideoRemarkName: string;
  liveUrl: string;
  previewUrl: string;
  auditStatus: SliceAuditStatus;
}

export interface SliceListParams {
  date?: string;
  dateEnd?: string;
  keyword?: string;
  page?: number;
  pageSize?: number;
}

export interface SliceListResult {
  list: VideoSliceItem[];
  total: number;
}

export async function fetchSliceList(
  params: SliceListParams
): Promise<BaseResponse<SliceListResult>> {
  return await request('/v1/slices', {
    method: 'get',
    params,
  });
}

export async function updateSliceName(
  id: string,
  name: string
): Promise<BaseResponse<VideoSliceItem>> {
  return await request(`/v1/slices/${id}/name`, {
    method: 'put',
    data: { name },
  });
}
