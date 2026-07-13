import type { BaseResponse } from './types';
import { request } from './http';

export interface AiPrompt {
  id: number;
  name: string;
  content: string;
  remark: string;
  created_by: number;
  created_at: string;
  updated_at: string;
  is_editable: number;
}

export type AiPromptId = number;

export interface AiPromptListParams {
  keywords?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  page_size?: number;
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

export interface UpdateAiPromptParams {
  name: string;
  content: string;
  remark?: string;
}

export async function fetchAiPromptList(
  params: AiPromptListParams
): Promise<BaseResponse<AiPromptListResult>> {
  return await request('/v1/llm-system-prompts', {
    method: 'get',
    params,
  });
}

export async function createAiPrompt(
  params: CreateAiPromptParams
): Promise<BaseResponse<AiPrompt>> {
  return await request('/v1/llm-system-prompts', {
    method: 'post',
    data: params,
  });
}

export async function updateAiPrompt(
  id: AiPromptId,
  params: UpdateAiPromptParams
): Promise<BaseResponse<AiPrompt>> {
  return await request(`/v1/llm-system-prompts/${id}`, {
    method: 'put',
    data: params,
  });
}

export async function updateAiPromptRemark(
  id: AiPromptId,
  remark: string
): Promise<BaseResponse<AiPrompt>> {
  return await request(`/v1/llm-system-prompts/${id}/remark`, {
    method: 'put',
    data: { remark },
  });
}

export async function deleteAiPrompt(id: AiPromptId): Promise<BaseResponse<null>> {
  return await request(`/v1/llm-system-prompts/${id}`, {
    method: 'delete',
  });
}
