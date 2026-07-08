import type { BaseResponse } from './types';
import { request } from './http';

export type ClipTaskItemStatus = 'pending' | 'processing' | 'running' | 'success' | 'failed';

export interface ClipTaskItem {
  taskId: string;
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

export async function fetchClipTaskList(): Promise<BaseResponse<ClipTaskListResult>> {
  return await request('/v1/clip-tasks', {
    method: 'get',
  });
}
