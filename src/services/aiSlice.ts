import type { SelectedCopySegment } from '~/pages/ManualVideoSlice/types';
import type { BaseResponse } from './types';
import type { ClipRange } from './slice';
import { request } from './http';

export interface AiSliceSelectParams {
  prompt: string;
  promptId?: string;
  clips: ClipRange[];
}

export interface AiSliceSelectResult {
  segments: SelectedCopySegment[];
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
