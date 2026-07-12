import type { BaseResponse } from './types';
import { request } from './http';

export interface SliceProject {
  id: string;
  sourceVideoId: string;
  sourceVideoName: string;
  remarkName: string;
  projectName: string;
  segmentCount: number;
  updatedAt: string;
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

export async function fetchSliceProjectList(
  params?: SliceProjectListParams
): Promise<BaseResponse<SliceProjectListResult>> {
  return await request('/v1/slice-projects', {
    method: 'get',
    params,
  });
}

export async function updateSliceProjectName(
  id: string,
  projectName: string
): Promise<BaseResponse<SliceProject>> {
  return await request(`/v1/slice-projects/${id}/name`, {
    method: 'put',
    data: { projectName },
  });
}
