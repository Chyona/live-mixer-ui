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

export interface SaveSliceProjectParams {
  projectName?: string;
  sourceVideoName?: string;
  remarkName?: string;
  projectSource?: SliceProjectSource;
  segments: SelectedCopySegment[];
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

export async function fetchSliceProjectDetail(
  sourceVideoId: string
): Promise<BaseResponse<SliceProjectDetail>> {
  return await request(`/v1/slice-projects/${sourceVideoId}`, {
    method: 'get',
  });
}

export async function saveSliceProject(
  sourceVideoId: string,
  params: SaveSliceProjectParams
): Promise<BaseResponse<SliceProjectDetail>> {
  return await request(`/v1/slice-projects/${sourceVideoId}/save`, {
    method: 'post',
    data: params,
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
