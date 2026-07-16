export type AsrStatus = 'pending' | 'processing' | 'completed' | 'failed';

/** ASR 词级结果，时间单位为毫秒 */
export interface LiveAsrWord {
  start_time: number;
  end_time: number;
  text: string;
}

/** ASR 句段，时间单位为毫秒 */
export interface LiveAsrSegment {
  speaker: string;
  start_time: number;
  end_time: number;
  text: string;
  words?: LiveAsrWord[];
}

/** 详情接口 `live_asr` 字段 */
export type LiveAsr = LiveAsrSegment[];

export interface SourceVideo {
  id: number;
  name: string;
  live_url: string;
  remark: string;
  /** 时长，单位毫秒 */
  duration: number;
  ext: string;
  asr_status: AsrStatus;
  asr_progress: number;
  asr_error_msg: string;
  asr_started_at: string;
  asr_updated_at: string;
  created_at: string;
  updated_at: string;
  created_by: number;
  /** 详情接口返回的 ASR 文案；列表接口通常不带此字段。时间单位为 ms */
  live_asr?: LiveAsr | null;
}

export type SourceVideoAsrFields = Pick<
  SourceVideo,
  'asr_status' | 'asr_progress' | 'asr_error_msg' | 'asr_started_at' | 'asr_updated_at'
>;

export function createInitialAsrState(): SourceVideoAsrFields {
  return {
    asr_status: 'pending',
    asr_progress: 0,
    asr_error_msg: '',
    asr_started_at: '',
    asr_updated_at: '',
  };
}
