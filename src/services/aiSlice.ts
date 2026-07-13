import type { BaseResponse } from './types';
import type { ClipRange } from './slice';
import { request } from './http';

export interface AiSliceSelectParams {
  prompt: string;
  promptId?: number;
  clips: ClipRange[];
  sourceVideoName?: string;
}

export interface AiSliceSelectResult {
  taskId: string;
}

export async function submitAiSliceSelection(
  sourceVideoId: string,
  params: AiSliceSelectParams
): Promise<BaseResponse<AiSliceSelectResult>> {
  return await request(`/v1/source-videos/${sourceVideoId}/ai-slice-select`, {
    method: 'post',
    data: params,
  });
}
