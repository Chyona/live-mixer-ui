import type { AsrStatus } from '~/services/sourceVideo';

export const ASR_STATUS_LABEL: Record<AsrStatus, string> = {
  pending: '等待 ASR',
  processing: 'ASR 转写中',
  success: 'ASR 已完成',
  failed: 'ASR 失败',
};

export function isAsrReady(status: AsrStatus): boolean {
  return status === 'success';
}

export function getAsrActionDisabledReason(status: AsrStatus, asr_error_msg?: string): string | null {
  const resolvedMessage = asr_error_msg?.trim();

  if (isAsrReady(status)) return null;

  if (status === 'failed') {
    return resolvedMessage ? `ASR 解析失败：${resolvedMessage}` : 'ASR 解析失败，暂无法进行此操作';
  }

  return `${ASR_STATUS_LABEL[status]}，暂无法进行此操作`;
}
