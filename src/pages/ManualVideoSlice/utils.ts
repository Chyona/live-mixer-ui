import type { SelectedCopySegment, TranscriptParagraph, TranscriptSegment } from './types';
import { speakerColors } from '~/style/semanticColors';

export const SPEAKER_COLORS = [...speakerColors];

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

const CLAUSE_SPLIT_RE = /(?<=[，。！？；])/g;

export function splitTextToSegments(
  text: string,
  start: number,
  end: number,
  idPrefix: string
): TranscriptSegment[] {
  const parts = text.split(CLAUSE_SPLIT_RE).filter(Boolean);
  if (parts.length <= 1) {
    return [{ id: idPrefix, start, end, text }];
  }

  const duration = end - start;
  let cursor = start;

  return parts.map((part, index) => {
    const ratio = part.length / text.length;
    const segmentEnd = index === parts.length - 1 ? end : cursor + duration * ratio;
    const segment = {
      id: `${idPrefix}-${index}`,
      start: cursor,
      end: segmentEnd,
      text: part,
    };
    cursor = segmentEnd;
    return segment;
  });
}

export function normalizeParagraphSegments(paragraph: TranscriptParagraph): TranscriptParagraph {
  if (paragraph.segments.length > 1) {
    return {
      ...paragraph,
      segments: paragraph.segments.flatMap((segment) =>
        splitTextToSegments(segment.text, segment.start, segment.end, segment.id)
      ),
    };
  }

  const only = paragraph.segments[0];
  if (!only) return paragraph;

  return {
    ...paragraph,
    segments: splitTextToSegments(only.text, only.start, only.end, only.id),
  };
}

export function normalizeTranscriptParagraphs(paragraphs: TranscriptParagraph[]) {
  return paragraphs.map(normalizeParagraphSegments);
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

export function deleteSelectedRangeFromSegment(
  segment: SelectedCopySegment,
  selectionStart: number,
  selectionEnd: number
): SelectedCopySegment[] | 'delete-all' | null {
  const text = segment.text;

  if (selectionStart < 0 || selectionEnd > text.length || selectionStart >= selectionEnd) {
    return null;
  }

  if (selectionStart === 0 && selectionEnd === text.length) {
    return 'delete-all';
  }

  const duration = segment.end - segment.start;
  if (duration <= 0.5) return null;

  const timeAt = (offset: number) => segment.start + (duration * offset) / text.length;
  const deleteStartTime = timeAt(selectionStart);
  const deleteEndTime = timeAt(selectionEnd);

  const beforeText = text.slice(0, selectionStart);
  const afterText = text.slice(selectionEnd);

  if (beforeText && afterText) {
    if (deleteStartTime - segment.start < 0.5 || segment.end - deleteEndTime < 0.5) {
      return null;
    }

    return [
      {
        ...segment,
        id: `${segment.id}-a-${Date.now()}`,
        text: beforeText,
        end: deleteStartTime,
      },
      {
        ...segment,
        id: `${segment.id}-b-${Date.now()}`,
        text: afterText,
        start: deleteEndTime,
      },
    ];
  }

  if (beforeText) {
    if (deleteStartTime - segment.start < 0.5) return null;
    return [{ ...segment, text: beforeText, end: deleteStartTime }];
  }

  if (afterText) {
    if (segment.end - deleteEndTime < 0.5) return null;
    return [{ ...segment, text: afterText, start: deleteEndTime }];
  }

  return null;
}

export function getTextSelectionOffsets(container: HTMLElement): { start: number; end: number } | null {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || !selection.rangeCount) return null;

  const range = selection.getRangeAt(0);
  if (!container.contains(range.commonAncestorContainer)) return null;

  const selectedText = range.toString();
  if (!selectedText) return null;

  const preRange = range.cloneRange();
  preRange.selectNodeContents(container);
  preRange.setEnd(range.startContainer, range.startOffset);

  const start = preRange.toString().length;
  const end = start + selectedText.length;

  if (start >= end) return null;

  return { start, end };
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

  let targetIndex = toIndex;
  if (fromIndex < toIndex) {
    targetIndex -= 1;
  }

  next.splice(targetIndex, 0, moved);
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

/** 文案列表滚动时，将目标元素置于视口偏上位置（默认约 36%，居中为 50%） */
export function scrollElementIntoViewPreferUpper(
  container: HTMLElement,
  element: HTMLElement,
  options?: { behavior?: ScrollBehavior; viewportRatio?: number }
) {
  const behavior = options?.behavior ?? 'smooth';
  const viewportRatio = options?.viewportRatio ?? 0.36;
  const containerRect = container.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();
  const elementTop = elementRect.top - containerRect.top + container.scrollTop;
  const elementCenter = elementTop + element.offsetHeight / 2;
  const targetScrollTop = elementCenter - container.clientHeight * viewportRatio;

  container.scrollTo({
    top: Math.max(0, targetScrollTop),
    behavior,
  });
}
