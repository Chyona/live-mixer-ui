import type { BaseResponse } from './types';
import { request } from './http';

export type ClipTaskItemStatus = 'pending' | 'processing' | 'running' | 'success' | 'failed';

export interface ClipTaskItem {
  taskId: string;
  clipName: string;
  sourceVideoId: string;
  sourceVideoName: string;
  m3u8Url: string;
  status: ClipTaskItemStatus;
  progress: number;
  videoUrls: string[];
  draftUrls: string[];
  message: string | null;
  createdAt: string;
}

export interface ClipTaskListResult {
  list: ClipTaskItem[];
  total: number;
}

export interface ClipTaskListParams {
  date?: string;
  dateEnd?: string;
  keyword?: string;
}

export async function fetchClipTaskList(
  params?: ClipTaskListParams
): Promise<BaseResponse<ClipTaskListResult>> {
  return await request('/v1/clip-tasks', {
    method: 'get',
    params,
  });
}

export async function fetchClipTaskDetail(taskId: string): Promise<BaseResponse<ClipTaskItem>> {
  return await request(`/v1/clip-tasks/${taskId}`, {
    method: 'get',
  });
}

export async function updateClipTaskName(
  taskId: string,
  clipName: string
): Promise<BaseResponse<ClipTaskItem>> {
  return await request(`/v1/clip-tasks/${taskId}/name`, {
    method: 'put',
    data: { clipName },
  });
}

export async function deleteClipTask(taskId: string): Promise<BaseResponse<null>> {
  return await request(`/v1/clip-tasks/${taskId}`, {
    method: 'delete',
  });
}
