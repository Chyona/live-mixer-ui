export type AsrStatus = 'pending' | 'processing' | 'success' | 'failed';

export interface SourceVideo {
  id: number;
  name: string;
  live_url: string;
  remark: string;
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
