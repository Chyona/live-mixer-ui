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

export interface ClipRange {
  start: number;
  end: number;
}

export interface SubmitClipParams {
  m3u8_url: string;
  clips: ClipRange[];
  prompt_id?: number;
  water_text: string;
  count: number;
  source_video_id?: string;
  source_video_name?: string;
}

export interface ClipSubmitResult {
  task_id: string;
}

export type ClipTaskStatus =
  | 'pending'
  | 'processing'
  | 'running'
  | 'success'
  | 'completed'
  | 'failed'
  | 'error';

export interface ClipTaskResult {
  task_id: string;
  status: ClipTaskStatus;
  progress: number;
  video_urls: string[];
  draft_urls: string[];
  error: string | null;
}

export async function submitClip(
  params: SubmitClipParams
): Promise<BaseResponse<ClipSubmitResult>> {
  return await request('/clipflow-ai/v2/video/process', {
    method: 'post',
    data: params,
  });
}

export async function getClip(taskId: string): Promise<BaseResponse<ClipTaskResult>> {
  return await request('/clipflow-ai/v1/task', {
    method: 'get',
    params: { task_id: taskId },
  });
}
