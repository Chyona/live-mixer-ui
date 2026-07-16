import axios from 'axios';

import { apiPath } from '~/utils/api';

import type { BaseResponse } from './types';
import { AppError, DEFAULT_REQUEST_TIMEOUT_MS, request } from './http';

export type {
  AsrStatus,
  SourceVideo,
  SourceVideoAsrFields,
} from './sourceVideo.model';
export { createInitialAsrState } from './sourceVideo.model';

import type { SourceVideo } from './sourceVideo.model';

function parseContentDispositionFilename(header?: string): string | null {
  if (!header) return null;

  const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1].trim());
    } catch {
      return utf8Match[1].trim();
    }
  }

  const plainMatch = /filename="?([^";]+)"?/i.exec(header);
  return plainMatch?.[1]?.trim() || null;
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function resolveBlobErrorMessage(error: unknown, fallback: string): Promise<string> {
  if (!(error instanceof AppError)) {
    return fallback;
  }

  const data = error.resp.response?.data;
  if (data instanceof Blob) {
    try {
      const text = await data.text();
      const payload = JSON.parse(text) as { message?: string; errorMessage?: string };
      const message =
        (typeof payload.message === 'string' && payload.message.trim()) ||
        (typeof payload.errorMessage === 'string' && payload.errorMessage.trim()) ||
        '';
      if (message) return message;
    } catch {
      // ignore parse failure
    }
  }

  return error.errorMessage || fallback;
}

export interface SourceVideoListParams {
  /** 开始日期 YYYY-MM-DD */
  start_date?: string;
  /** 结束日期 YYYY-MM-DD */
  end_date?: string;
  /** 标题关键词，英文逗号分隔，匹配 name/remark */
  title_keyword?: string;
  /** 全局关键词，英文逗号分隔，匹配 live_url/asr_error_msg/name/remark */
  global_keyword?: string;
  page?: number;
  /** 每页数量，默认 10 */
  page_size?: number;
}

export interface SourceVideoListResult {
  list: SourceVideo[];
  total: number;
}

export interface CreateSourceVideoParams {
  name: string;
  live_url: string;
  remark?: string;
}

export type SourceVideoId = number | string;

export async function fetchSourceVideoList(
  params: SourceVideoListParams
): Promise<BaseResponse<SourceVideoListResult>> {
  return await request('/v1/live-materials', {
    method: 'get',
    params,
  });
}

export async function fetchSourceVideoDetail(
  id: SourceVideoId
): Promise<BaseResponse<SourceVideo>> {
  return await request(`/v1/live-materials/${id}`, {
    method: 'get',
  });
}

/** 修改源视频名称或备注：接口要求 name、remark 两个字段都传 */
export async function updateSourceVideo(
  id: SourceVideoId,
  params: Partial<CreateSourceVideoParams>
): Promise<BaseResponse<SourceVideo>> {
  return await request(`/v1/live-materials/${id}`, {
    method: 'put',
    data: params,
  });
}

export async function deleteSourceVideo(id: SourceVideoId): Promise<BaseResponse<null>> {
  return await request(`/v1/live-materials/${id}`, {
    method: 'delete',
  });
}

export async function createSourceVideo(
  params: CreateSourceVideoParams
): Promise<BaseResponse<SourceVideo>> {
  return await request('/v1/live-materials', {
    method: 'post',
    data: params,
  });
}

export async function retrySourceVideoAsr(id: SourceVideoId): Promise<BaseResponse<SourceVideo>> {
  return await request(`/v1/live-materials/${id}/asr/retry`, {
    method: 'post',
  });
}

/**
 * 下载 ASR 字幕（原始 live_asr JSON）。
 * 仅 asr_status=completed 且内容非空时可下载。
 */
export async function downloadSourceVideoAsrSubtitle(
  id: SourceVideoId,
  fallbackFilename: string
): Promise<void> {
  try {
    const response = await axios.request<Blob>({
      url: apiPath(`/v1/live-materials/${id}/asr/subtitle`),
      method: 'get',
      responseType: 'blob',
      timeout: DEFAULT_REQUEST_TIMEOUT_MS,
    });

    const blob = response.data;
    if (!blob || blob.size === 0) {
      throw new Error('暂无字幕文案');
    }

    const filename =
      parseContentDispositionFilename(response.headers['content-disposition']) || fallbackFilename;

    triggerBlobDownload(blob, filename);
  } catch (error) {
    if (error instanceof Error && error.message === '暂无字幕文案') {
      throw error;
    }

    const message = await resolveBlobErrorMessage(error, '字幕下载失败');
    if (error instanceof AppError) {
      throw new AppError(message, error.errorCode, error.resp);
    }
    throw new Error(message);
  }
}
