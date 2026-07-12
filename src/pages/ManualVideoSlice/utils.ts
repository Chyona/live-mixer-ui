import type { SelectedCopySegment, TranscriptParagraph, TranscriptSegment } from './types';

export const SPEAKER_COLORS = [
  '#1677ff',
  '#52c41a',
  '#fa8c16',
  '#eb2f96',
  '#722ed1',
  '#13c2c2',
];

export function getSpeakerColor(speakerId: string, speakerIds: string[]) {
  const index = speakerIds.indexOf(speakerId);
  return SPEAKER_COLORS[index >= 0 ? index % SPEAKER_COLORS.length : 0];
}

export function formatSliceTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 10);

  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  if (ms > 0) {
    return `${mins}:${String(secs).padStart(2, '0')}.${ms}`;
  }

  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export function getParagraphText(paragraph: TranscriptParagraph) {
  return paragraph.segments.map((segment) => segment.text).join('');
}

export function getParagraphRange(paragraph: TranscriptParagraph) {
  if (!paragraph.segments.length) {
    return { start: 0, end: 0 };
  }

  const firstSegment = paragraph.segments[0];
  const lastSegment = paragraph.segments[paragraph.segments.length - 1];
  if (!firstSegment || !lastSegment) {
    return { start: 0, end: 0 };
  }

  return {
    start: firstSegment.start,
    end: lastSegment.end,
  };
}

export function findActiveSegment(
  paragraphs: TranscriptParagraph[],
  currentTime: number
): { paragraphId: string; segmentId: string } | null {
  for (const paragraph of paragraphs) {
    for (const segment of paragraph.segments) {
      if (currentTime >= segment.start && currentTime < segment.end) {
        return { paragraphId: paragraph.id, segmentId: segment.id };
      }
    }
  }
  return null;
}

export function collectSegmentsFromSelection(
  container: HTMLElement,
  selection: Selection
): TranscriptSegment[] {
  if (selection.isCollapsed || !selection.rangeCount) return [];

  const range = selection.getRangeAt(0);
  const nodes = container.querySelectorAll<HTMLElement>('[data-segment-id]');
  const picked: TranscriptSegment[] = [];

  nodes.forEach((node) => {
    if (!range.intersectsNode(node)) return;

    const start = Number(node.dataset.start);
    const end = Number(node.dataset.end);
    const text = node.textContent ?? '';

    if (!Number.isFinite(start) || !Number.isFinite(end) || !text) return;

    picked.push({
      id: node.dataset.segmentId ?? `${start}-${end}`,
      start,
      end,
      text,
    });
  });

  return picked.sort((a, b) => a.start - b.start);
}

export function segmentsToCopySegment(
  segments: TranscriptSegment[],
  speakerId: string,
  speakerName: string
): SelectedCopySegment | null {
  if (!segments.length) return null;

  const first = segments[0];
  const last = segments[segments.length - 1];
  if (!first || !last) return null;

  return {
    id: `copy-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    speakerId,
    speakerName,
    text: segments.map((item) => item.text).join(''),
    start: first.start,
    end: last.end,
  };
}

export function paragraphToCopySegment(paragraph: TranscriptParagraph): SelectedCopySegment | null {
  return segmentsToCopySegment(paragraph.segments, paragraph.speakerId, paragraph.speakerName);
}

export function splitCopySegment(segment: SelectedCopySegment): [SelectedCopySegment, SelectedCopySegment] | null {
  const duration = segment.end - segment.start;
  if (duration <= 1) return null;

  const midTime = segment.start + duration / 2;
  const midpoint = Math.ceil(segment.text.length / 2);

  const first: SelectedCopySegment = {
    ...segment,
    id: `${segment.id}-a`,
    text: segment.text.slice(0, midpoint),
    end: midTime,
  };

  const second: SelectedCopySegment = {
    ...segment,
    id: `${segment.id}-b`,
    text: segment.text.slice(midpoint),
    start: midTime,
  };

  return [first, second];
}

export function adjustSegmentTime(
  segment: SelectedCopySegment,
  field: 'start' | 'end',
  delta: number,
  videoDuration: number
): SelectedCopySegment {
  const next = { ...segment };
  const value = next[field] + delta;

  if (field === 'start') {
    next.start = Math.max(0, Math.min(value, next.end - 0.5));
  } else {
    next.end = Math.min(videoDuration || value, Math.max(value, next.start + 0.5));
  }

  return next;
}

export function getTotalSelectedDuration(segments: SelectedCopySegment[]) {
  return segments.reduce((sum, item) => sum + (item.end - item.start), 0);
}

export function reorderSegments(
  segments: SelectedCopySegment[],
  fromIndex: number,
  toIndex: number
) {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return segments;
  if (fromIndex >= segments.length || toIndex >= segments.length) return segments;

  const next = [...segments];
  const [moved] = next.splice(fromIndex, 1);
  if (!moved) return segments;
  next.splice(toIndex, 0, moved);
  return next;
}

export function highlightKeyword(text: string, keyword: string) {
  if (!keyword.trim()) return text;

  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}

function formatSrtTimestamp(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);

  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

export function buildTranscriptSrt(paragraphs: TranscriptParagraph[]): string {
  const cues = paragraphs.flatMap((paragraph) =>
    paragraph.segments.map((segment) => ({
      start: segment.start,
      end: segment.end,
      text: `${paragraph.speakerName}：${segment.text}`.trim(),
    }))
  );

  return cues
    .map((cue, index) => {
      return `${index + 1}\n${formatSrtTimestamp(cue.start)} --> ${formatSrtTimestamp(cue.end)}\n${cue.text}`;
    })
    .join('\n\n');
}

export function downloadTextFile(content: string, filename: string) {
  const blob = new Blob([`\uFEFF${content}`], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function sanitizeDownloadFilename(name: string) {
  return name.replace(/[\\/:*?"<>|]/g, '_').trim() || 'subtitle';
}
