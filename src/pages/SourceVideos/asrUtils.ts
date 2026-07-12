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

export function parseLiveAsrMessage(live_asr: string): string | undefined {
  if (!live_asr?.trim()) return undefined;

  try {
    const parsed = JSON.parse(live_asr) as { message?: string; error?: string; errorMessage?: string };
    return parsed.message || parsed.error || parsed.errorMessage;
  } catch {
    return undefined;
  }
}

export function getAsrActionDisabledReason(
  status: AsrStatus,
  live_asr?: string,
  message?: string
): string | null {
  const resolvedMessage = message ?? (live_asr ? parseLiveAsrMessage(live_asr) : undefined);

  if (isAsrReady(status)) return null;

  if (status === 'failed') {
    return resolvedMessage ? `ASR 解析失败：${resolvedMessage}` : 'ASR 解析失败，暂无法进行此操作';
  }

  return `${ASR_STATUS_LABEL[status]}，暂无法进行此操作`;
}
