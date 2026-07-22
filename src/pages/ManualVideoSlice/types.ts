export interface TranscriptWord {
  /** 秒 */
  start: number;
  /** 秒 */
  end: number;
  text: string;
}

export interface TranscriptSegment {
  id: string;
  start: number;
  end: number;
  text: string;
  /** 字级时间轴（来自 live_asr.words），可选 */
  words?: TranscriptWord[];
}

export interface TranscriptParagraph {
  id: string;
  speakerId: string;
  speakerName: string;
  segments: TranscriptSegment[];
}

export interface SelectedCopySegment {
  id: string;
  speakerId: string;
  speakerName: string;
  text: string;
  start: number;
  end: number;
  /** 选入时的原始起点；用于限制前方最多再扩 SEGMENT_EXTEND_MAX_SEC */
  originStart?: number;
  /** 选入时的原始终点；用于限制后方最多再扩 SEGMENT_EXTEND_MAX_SEC */
  originEnd?: number;
}

export interface ManualSliceDraft {
  id: string;
  name: string;
  sourceVideoId: string;
  segments: SelectedCopySegment[];
  updatedAt: string;
}
