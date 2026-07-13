export interface TranscriptSegment {
  id: string;
  start: number;
  end: number;
  text: string;
}

export interface TranscriptParagraph {
  id: string;
  speakerId: string;
  speakerName: string;
  segments: TranscriptSegment[];
}

export interface VideoTranscript {
  sourceVideoId: string;
  paragraphs: TranscriptParagraph[];
}

export interface SelectedCopySegment {
  id: string;
  speakerId: string;
  speakerName: string;
  text: string;
  start: number;
  end: number;
}

export interface ManualSliceDraft {
  id: string;
  name: string;
  sourceVideoId: string;
  segments: SelectedCopySegment[];
  updatedAt: string;
}
