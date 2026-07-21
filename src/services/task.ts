import type { BaseResponse } from './types';
import { request } from './http';

export type ClipTaskItemStatus = 'pending' | 'processing' | 'completed' | 'failed';

/** 任务类型 */
export type GenerationTaskType = 'ai_slice' | 'draft' | 'ai_slice_draft' | (string & {});

/** ext 字段解析结果 */
export interface ClipTaskExt {
  live_id?: number;
  video_project_id?: number;
  sys_prompt_id?: number;
  target_duration_ms?: number;
  draft_url?: string;
  draft_urls?: string[];
  live_url?: string;
}

/**
 * 任务列表项（与接口返回结构一致）
 */
export interface ClipTaskItem {
  id: string;
  type: GenerationTaskType;
  status: ClipTaskItemStatus;
  progress: number;
  /** 系统提示词 */
  sys_prompt: string;
  /** 用户提示词 */
  usr_prompt: string;
  /** 项目名称 */
  video_project_name: string;
  /** 直播素材 URL */
  live_url: string;
  /** 草稿地址（一键成片 / 生成草稿） */
  draft_url: string;
  created_by: string;
  error_message: string;
  /** 原始 JSON 字符串 */
  ext: string;
  created_at: string;
  started_at: string;
  completed_at: string;
  updated_at: string;
}

export interface ClipTaskListResult {
  list: ClipTaskItem[];
  total: number;
  page?: number;
  page_size?: number;
}

/** 任务列表查询参数 */
export interface ClipTaskListParams {
  /** 任务类型：ai_slice / draft / ai_slice_draft */
  type?: GenerationTaskType;
  /** 任务状态：pending / processing / completed / failed */
  status?: ClipTaskItemStatus;
  /** 开始日期 YYYY-MM-DD，按 created_at 筛选 */
  start_date?: string;
  /** 结束日期 YYYY-MM-DD，按 created_at 筛选 */
  end_date?: string;
  /** 关键词搜索 */
  keywords?: string;
  page?: number;
  /** 每页数量，默认 10 */
  page_size?: number;
}

export function parseClipTaskExt(ext: string | ClipTaskExt | null | undefined): ClipTaskExt {
  if (!ext) return {};
  if (typeof ext === 'object') return ext;
  try {
    const parsed = JSON.parse(ext) as ClipTaskExt;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function resolveLiveUrl(
  raw: (Partial<ClipTaskItem> & Record<string, unknown>) | null | undefined,
  ext: ClipTaskExt
): string {
  const topLevel = String(
    raw?.live_url ?? (raw as { video_url?: string })?.video_url ?? ''
  ).trim();
  if (topLevel) return topLevel;
  if (ext.live_url?.trim()) return ext.live_url.trim();
  return '';
}

function resolveDraftUrl(
  raw: (Partial<ClipTaskItem> & Record<string, unknown>) | null | undefined
): string {
  const topLevel = String(raw?.draft_url ?? '').trim();
  if (topLevel) return topLevel;

  const draftUrls = raw?.draft_urls;
  if (Array.isArray(draftUrls) && draftUrls.length > 0) {
    const first = String(draftUrls[0] ?? '').trim();
    if (first) return first;
  }

  const ext = parseClipTaskExt(
    typeof raw?.ext === 'string' ? raw.ext : raw?.ext != null ? JSON.stringify(raw.ext) : ''
  );
  if (ext.draft_url?.trim()) return ext.draft_url.trim();
  if (Array.isArray(ext.draft_urls) && ext.draft_urls[0]?.trim()) {
    return ext.draft_urls[0].trim();
  }

  return '';
}

export function normalizeClipTaskItem(raw: Partial<ClipTaskItem> | null | undefined): ClipTaskItem {
  const type = String(raw?.type ?? '');
  const normalizedType: GenerationTaskType =
    type === 'ai_slice_select' ? 'ai_slice' : type === 'clip_generate' ? 'ai_slice_draft' : type || 'draft';

  const rawStatus = String(raw?.status ?? 'pending');
  const statusMap: Record<string, ClipTaskItemStatus> = {
    pending: 'pending',
    processing: 'processing',
    running: 'processing',
    completed: 'completed',
    success: 'completed',
    failed: 'failed',
    error: 'failed',
  };

  const ext =
    typeof raw?.ext === 'string' ? raw.ext : raw?.ext != null ? JSON.stringify(raw.ext) : '';
  const parsedExt = parseClipTaskExt(ext);

  return {
    id: String(raw?.id ?? '').trim(),
    type: normalizedType,
    status: statusMap[rawStatus] ?? 'pending',
    progress: Number(raw?.progress ?? 0),
    sys_prompt: String(raw?.sys_prompt ?? ''),
    usr_prompt: String(raw?.usr_prompt ?? (raw as { usrPrompt?: string })?.usrPrompt ?? ''),
    video_project_name: String(
      (raw as { video_project_name?: string; project_name?: string })?.video_project_name ??
        (raw as { project_name?: string })?.project_name ??
        ''
    ),
    live_url: resolveLiveUrl(raw as Partial<ClipTaskItem> & Record<string, unknown>, parsedExt),
    draft_url: resolveDraftUrl(raw as Partial<ClipTaskItem> & Record<string, unknown>),
    created_by: String(raw?.created_by ?? ''),
    error_message: String(raw?.error_message ?? ''),
    ext,
    created_at: String(raw?.created_at ?? ''),
    started_at: String(raw?.started_at ?? ''),
    completed_at: String(raw?.completed_at ?? ''),
    updated_at: String(raw?.updated_at ?? ''),
  };
}

function pickDefinedParams<T extends object>(params: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== '')
  ) as Partial<T>;
}

export async function fetchClipTaskList(
  params?: ClipTaskListParams
): Promise<BaseResponse<ClipTaskListResult>> {
  const response = await request<BaseResponse<ClipTaskListResult>>('/v1/tasks', {
    method: 'get',
    params: params ? pickDefinedParams(params) : undefined,
  });

  return {
    ...response,
    data: {
      list: (response.data?.list ?? []).map(normalizeClipTaskItem),
      total: Number(response.data?.total ?? 0),
      page: response.data?.page,
      page_size: response.data?.page_size,
    },
  };
}

export async function fetchClipTaskDetail(taskId: string): Promise<BaseResponse<ClipTaskItem>> {
  const response = await request<BaseResponse<ClipTaskItem>>(`/v1/tasks/${taskId}`, {
    method: 'get',
  });

  return {
    ...response,
    data: normalizeClipTaskItem(response.data),
  };
}

export async function deleteClipTask(taskId: string): Promise<BaseResponse<null>> {
  return await request(`/v1/tasks/${taskId}`, {
    method: 'delete',
  });
}
