import type { ClipTaskItem, ClipTaskItemStatus, GenerationTaskType } from '~/services/task';
import { parseClipTaskExt } from '~/services/task';

export function getGenerationTaskTypeLabel(taskType: GenerationTaskType | undefined): string {
  switch (taskType) {
    case 'ai_slice':
      return 'AI 选片';
    case 'draft':
      return '生成草稿';
    case 'ai_slice_draft':
      return '一键成片';
    default:
      return taskType || '任务';
  }
}

export function getClipTaskStatusLabel(status: ClipTaskItemStatus): string {
  switch (status) {
    case 'pending':
      return '待处理';
    case 'processing':
      return '处理中';
    case 'completed':
      return '已完成';
    case 'failed':
      return '失败';
    default:
      return status;
  }
}

export const CLIP_TASK_STATUS_OPTIONS: { label: string; value: ClipTaskItemStatus }[] = [
  { label: '待处理', value: 'pending' },
  { label: '处理中', value: 'processing' },
  { label: '已完成', value: 'completed' },
  { label: '失败', value: 'failed' },
];

export const CLIP_TASK_TYPE_OPTIONS: { label: string; value: GenerationTaskType }[] = [
  { label: 'AI 选片', value: 'ai_slice' },
  { label: '生成草稿', value: 'draft' },
  { label: '一键成片', value: 'ai_slice_draft' },
];

export function isClipTaskActive(status: ClipTaskItemStatus): boolean {
  return status === 'pending' || status === 'processing';
}

export function getClipTaskDisplayName(task: ClipTaskItem): string {
  if (task.video_project_name?.trim()) return task.video_project_name.trim();
  if (task.sys_prompt?.trim()) return task.sys_prompt.trim();
  const ext = parseClipTaskExt(task.ext);
  if (ext.video_project_id) return `项目 #${ext.video_project_id}`;
  return `任务 #${task.id}`;
}

export function getClipTaskLiveId(task: ClipTaskItem): number | undefined {
  const liveId = parseClipTaskExt(task.ext).live_id;
  return liveId && liveId > 0 ? liveId : undefined;
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
