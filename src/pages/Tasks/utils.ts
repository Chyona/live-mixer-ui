import type { ClipTaskItem, ClipTaskItemStatus } from '~/services/task';
import type { ClipTaskResult } from '~/services/slice';

import type { Dayjs } from 'dayjs';

export function buildDateRange(dateRange: [Dayjs | null, Dayjs | null] | null) {
  if (!dateRange?.[0]) {
    return { date: undefined, dateEnd: undefined };
  }

  return {
    date: dateRange[0].format('YYYY-MM-DD'),
    dateEnd: (dateRange[1] ?? dateRange[0]).format('YYYY-MM-DD'),
  };
}

export function getGenerationTaskTypeLabel(taskType: ClipTaskItem['taskType']): string {
  switch (taskType) {
    case 'ai_slice_select':
      return 'AI 选片';
    case 'clip_generate':
    default:
      return '一键成片';
  }
}

export function getClipTaskStatusLabel(status: ClipTaskItemStatus): string {
  switch (status) {
    case 'pending':
      return '等待中';
    case 'processing':
      return '处理中';
    case 'running':
      return '生成中';
    case 'success':
      return '已完成';
    case 'failed':
      return '失败';
    default:
      return status;
  }
}

export function isClipTaskActive(status: ClipTaskItemStatus): boolean {
  return status === 'pending' || status === 'processing' || status === 'running';
}

export function normalizeClipTaskStatus(status: ClipTaskResult['status']): ClipTaskItemStatus {
  if (status === 'completed') return 'success';
  if (status === 'error') return 'failed';
  return status;
}

export function mergeClipTaskPollResult(task: ClipTaskItem, result: ClipTaskResult): ClipTaskItem {
  return {
    ...task,
    status: normalizeClipTaskStatus(result.status),
    progress: result.progress,
    videoUrls: result.video_urls,
    draftUrls: result.draft_urls,
    message: result.error,
  };
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand('copy');
    document.body.removeChild(textarea);
    return copied;
  } catch {
    return false;
  }
}
