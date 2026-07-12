import type { BaseResponse } from './types';
import { request } from './http';

export interface AiPrompt {
  id: string;
  name: string;
  content: string;
  remark: string;
  creatorName: string;
  createdAt: string;
  updatedAt: string;
}

export interface AiPromptListParams {
  keyword?: string;
  page?: number;
  pageSize?: number;
}

export interface AiPromptListResult {
  list: AiPrompt[];
  total: number;
}

export interface CreateAiPromptParams {
  name: string;
  content: string;
  remark?: string;
}

export async function fetchAiPromptList(
  params: AiPromptListParams
): Promise<BaseResponse<AiPromptListResult>> {
  return await request('/v1/ai-prompts', {
    method: 'get',
    params,
  });
}

export async function createAiPrompt(
  params: CreateAiPromptParams
): Promise<BaseResponse<AiPrompt>> {
  return await request('/v1/ai-prompts', {
    method: 'post',
    data: params,
  });
}

export async function updateAiPromptRemark(
  id: string,
  remark: string
): Promise<BaseResponse<AiPrompt>> {
  return await request(`/v1/ai-prompts/${id}/remark`, {
    method: 'put',
    data: { remark },
  });
}

export async function deleteAiPrompt(id: string): Promise<BaseResponse<null>> {
  return await request(`/v1/ai-prompts/${id}`, {
    method: 'delete',
  });
}
