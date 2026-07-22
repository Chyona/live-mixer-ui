import type { LiveAsr, LiveAsrSegment } from '~/services/sourceVideo.model';
import type {
  SelectedCopySegment,
  TranscriptParagraph,
  TranscriptSegment,
  TranscriptWord,
} from './types';
import { speakerColors } from '~/style/semanticColors';

export const SPEAKER_COLORS = [...speakerColors];

export function getSpeakerColor(speakerId: string, speakerIds: string[]) {
  const index = speakerIds.indexOf(speakerId);
  return SPEAKER_COLORS[index >= 0 ? index % SPEAKER_COLORS.length : 0];
}

export function formatSliceTime(seconds: number): string {
  const totalTenths = Math.round(Math.max(0, seconds) * 10);
  const tenths = totalTenths % 10;
  const totalSecs = Math.floor(totalTenths / 10);
  const secs = totalSecs % 60;
  const totalMins = Math.floor(totalSecs / 60);
  const mins = totalMins % 60;
  const hrs = Math.floor(totalMins / 60);

  // 进位：.round 后 tenths 已是 0-9
  const pad2 = (n: number) => String(n).padStart(2, '0');
  const clock =
    hrs > 0 ? `${hrs}:${pad2(mins)}:${pad2(secs)}` : `${mins}:${pad2(secs)}`;

  return tenths > 0 ? `${clock}.${tenths}` : clock;
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

/** 按字符区间切出对应 words（words 与 text 按顺序对齐） */
export function sliceWordsByCharRange(
  words: TranscriptWord[],
  charStart: number,
  charEnd: number
): TranscriptWord[] {
  if (!words.length || charEnd <= charStart) return [];

  const picked: TranscriptWord[] = [];
  let cursor = 0;
  for (const word of words) {
    const len = Math.max(word.text.length, 1);
    const wStart = cursor;
    const wEnd = cursor + len;
    cursor = wEnd;
    if (wEnd <= charStart || wStart >= charEnd) continue;
    picked.push(word);
  }
  return picked;
}

function rangeFromWords(
  words: TranscriptWord[],
  fallbackStart: number,
  fallbackEnd: number
): { start: number; end: number } {
  if (!words.length) return { start: fallbackStart, end: fallbackEnd };
  const first = words[0];
  const last = words[words.length - 1];
  if (!first || !last) return { start: fallbackStart, end: fallbackEnd };
  return {
    start: first.start,
    end: Math.max(last.end, first.start),
  };
}

const CLAUSE_SPLIT_RE = /(?<=[，。！？；])/g;

export function splitTextToSegments(
  text: string,
  start: number,
  end: number,
  idPrefix: string,
  words?: TranscriptWord[]
): TranscriptSegment[] {
  const parts = text.split(CLAUSE_SPLIT_RE).filter(Boolean);
  if (parts.length <= 1) {
    return [{ id: idPrefix, start, end, text, words: words?.length ? words : undefined }];
  }

  const duration = end - start;
  let cursor = start;
  let charOffset = 0;

  return parts.map((part, index) => {
    const partCharStart = charOffset;
    const partCharEnd = charOffset + part.length;
    charOffset = partCharEnd;

    const partWords = words?.length
      ? sliceWordsByCharRange(words, partCharStart, partCharEnd)
      : [];
    const fromWords = rangeFromWords(partWords, -1, -1);

    let segmentStart: number;
    let segmentEnd: number;
    if (partWords.length && fromWords.start >= 0) {
      segmentStart = fromWords.start;
      segmentEnd = fromWords.end;
    } else {
      // 无字级时间时退回按字数比例插值
      const ratio = part.length / text.length;
      segmentStart = cursor;
      segmentEnd = index === parts.length - 1 ? end : cursor + duration * ratio;
    }

    if (index === parts.length - 1) {
      segmentEnd = Math.max(segmentEnd, end);
    }

    const segment: TranscriptSegment = {
      id: `${idPrefix}-${index}`,
      start: segmentStart,
      end: Math.max(segmentEnd, segmentStart),
      text: part,
      words: partWords.length ? partWords : undefined,
    };
    cursor = segment.end;
    return segment;
  });
}

export function normalizeParagraphSegments(paragraph: TranscriptParagraph): TranscriptParagraph {
  if (paragraph.segments.length > 1) {
    return {
      ...paragraph,
      segments: paragraph.segments.flatMap((segment) =>
        splitTextToSegments(segment.text, segment.start, segment.end, segment.id, segment.words)
      ),
    };
  }

  const only = paragraph.segments[0];
  if (!only) return paragraph;

  return {
    ...paragraph,
    segments: splitTextToSegments(only.text, only.start, only.end, only.id, only.words),
  };
}

export function normalizeTranscriptParagraphs(paragraphs: TranscriptParagraph[]) {
  return paragraphs.map(normalizeParagraphSegments);
}

function msToSeconds(ms: number) {
  return ms / 1000;
}

function formatSpeakerName(speaker: string) {
  const trimmed = speaker.trim();
  if (!trimmed) return '说话人';
  if (/^\d+$/.test(trimmed)) return `说话人${trimmed}`;
  return trimmed;
}

function liveAsrItemToParagraph(item: LiveAsrSegment, index: number): TranscriptParagraph {
  const speakerId = String(item.speaker ?? '').trim() || '0';
  const words: TranscriptWord[] = (item.words ?? [])
    .map((word) => ({
      start: msToSeconds(Number(word.start_time)),
      end: msToSeconds(Number(word.end_time)),
      text: String(word.text ?? ''),
    }))
    .filter((word) => word.text.length > 0 && Number.isFinite(word.start) && Number.isFinite(word.end));

  const text = item.text || words.map((word) => word.text).join('');

  return {
    id: `asr-p-${index}`,
    speakerId,
    speakerName: formatSpeakerName(speakerId),
    // 句级入参 + 字级 words；随后由 normalize 按标点拆分并继承字级时间
    segments: [
      {
        id: `asr-${index}`,
        start: msToSeconds(item.start_time),
        end: msToSeconds(item.end_time),
        text,
        words: words.length ? words : undefined,
      },
    ],
  };
}

/** 将详情接口 `live_asr`（ms）转为剪辑页内部段落结构（秒） */
export function liveAsrToTranscriptParagraphs(liveAsr: LiveAsr | null | undefined): TranscriptParagraph[] {
  if (!liveAsr?.length) return [];
  return liveAsr.map(liveAsrItemToParagraph);
}

/** 扁平化全部字级时间轴（按开始时间排序） */
export function flattenTranscriptWords(paragraphs: TranscriptParagraph[]): TranscriptWord[] {
  return paragraphs
    .flatMap((paragraph) => paragraph.segments.flatMap((segment) => segment.words ?? []))
    .slice()
    .sort((a, b) => a.start - b.start || a.end - b.end);
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

export type TranscriptHighlightMode = 'playback';

export interface TranscriptHighlight {
  paragraphId: string;
  segmentIds: string[];
  mode: TranscriptHighlightMode;
}

export function paragraphSelectionToCopySegment(
  container: HTMLElement,
  paragraph: TranscriptParagraph
): SelectedCopySegment | null {
  const offsets = getTextSelectionOffsets(container);
  if (!offsets) return null;

  const paragraphText = getParagraphText(paragraph);
  const text = paragraphText.slice(offsets.start, offsets.end);
  if (!text.trim()) return null;

  const paragraphRange = getParagraphRange(paragraph);
  const duration = paragraphRange.end - paragraphRange.start;
  if (duration <= 0) return null;

  const allWords = paragraph.segments.flatMap((segment) => segment.words ?? []);
  const selectedWords = sliceWordsByCharRange(allWords, offsets.start, offsets.end);
  const fromWords = rangeFromWords(selectedWords, -1, -1);

  const start =
    selectedWords.length && fromWords.start >= 0
      ? fromWords.start
      : paragraphRange.start + (duration * offsets.start) / paragraphText.length;
  const end =
    selectedWords.length && fromWords.end >= 0
      ? fromWords.end
      : paragraphRange.start + (duration * offsets.end) / paragraphText.length;

  if (end <= start) return null;

  return {
    id: `copy-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    speakerId: paragraph.speakerId,
    speakerName: paragraph.speakerName,
    text,
    start,
    end,
    originStart: start,
    originEnd: end,
  };
}

export function buildTranscriptHighlight(options: {
  playbackSync: { paragraphId: string; segmentId: string } | null;
}): TranscriptHighlight | null {
  if (!options.playbackSync) return null;

  return {
    paragraphId: options.playbackSync.paragraphId,
    segmentIds: [options.playbackSync.segmentId],
    mode: 'playback',
  };
}

export function findActiveCopySegment(
  segments: SelectedCopySegment[],
  currentTime: number
): SelectedCopySegment | null {
  return (
    segments.find((segment) => currentTime >= segment.start && currentTime < segment.end) ?? null
  );
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
    originStart: first.start,
    originEnd: last.end,
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
        originStart: segment.start,
        originEnd: deleteStartTime,
      },
      {
        ...segment,
        id: `${segment.id}-b-${Date.now()}`,
        text: afterText,
        start: deleteEndTime,
        originStart: deleteEndTime,
        originEnd: segment.end,
      },
    ];
  }

  if (beforeText) {
    if (deleteStartTime - segment.start < 0.5) return null;
    return [
      {
        ...segment,
        text: beforeText,
        end: deleteStartTime,
        originStart: segment.originStart ?? segment.start,
        originEnd: deleteStartTime,
      },
    ];
  }

  if (afterText) {
    if (segment.end - deleteEndTime < 0.5) return null;
    return [
      {
        ...segment,
        text: afterText,
        start: deleteEndTime,
        originStart: deleteEndTime,
        originEnd: segment.originEnd ?? segment.end,
      },
    ];
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

const MIN_SEGMENT_DURATION = 0.5;

/** 每次点击扩展步长（秒） */
export const SEGMENT_EXTEND_STEP_SEC = 0.1;
/** 单侧相对原始边界最多扩展（秒） */
export const SEGMENT_EXTEND_MAX_SEC = 0.5;

function getSegmentOriginStart(segment: SelectedCopySegment) {
  return Number.isFinite(segment.originStart) ? Number(segment.originStart) : segment.start;
}

function getSegmentOriginEnd(segment: SelectedCopySegment) {
  return Number.isFinite(segment.originEnd) ? Number(segment.originEnd) : segment.end;
}

/** 计算片段某一侧最多还能扩展多少秒（列表邻居 + 视频边界 + 单侧最多 +0.5s） */
export function getSegmentExtendableSeconds(
  segments: SelectedCopySegment[],
  index: number,
  edge: 'start' | 'end',
  videoDuration: number
): number {
  const segment = segments[index];
  if (!segment) return 0;

  if (edge === 'start') {
    const prev = index > 0 ? segments[index - 1] : null;
    const lowerBound = prev ? prev.end : 0;
    const neighborGap = Math.max(0, segment.start - lowerBound);
    const already = Math.max(0, getSegmentOriginStart(segment) - segment.start);
    const budget = Math.max(0, SEGMENT_EXTEND_MAX_SEC - already);
    return Math.min(neighborGap, budget);
  }

  const next = index < segments.length - 1 ? segments[index + 1] : null;
  const upperBound =
    next != null
      ? next.start
      : Number.isFinite(videoDuration) && videoDuration > 0
        ? videoDuration
        : Number.POSITIVE_INFINITY;
  const neighborGap = Math.max(0, upperBound - segment.end);
  const already = Math.max(0, segment.end - getSegmentOriginEnd(segment));
  const budget = Math.max(0, SEGMENT_EXTEND_MAX_SEC - already);
  return Math.min(neighborGap, budget);
}

/**
 * 向片段前/后扩展时间；优先用字级 ASR 补齐文案并吸附字边界。
 * 不超过上一片段结尾 / 下一片段开头、视频边界，以及单侧最多 +SEGMENT_EXTEND_MAX_SEC。
 */
export function extendSegmentEdge(
  segments: SelectedCopySegment[],
  index: number,
  edge: 'start' | 'end',
  deltaSec: number,
  videoDuration: number,
  transcriptWords: TranscriptWord[] = []
): { segments: SelectedCopySegment[]; applied: number } | null {
  const segment = segments[index];
  if (!segment || !(deltaSec > 0)) return null;

  const available = getSegmentExtendableSeconds(segments, index, edge, videoDuration);
  const applied = Math.min(deltaSec, available);
  if (applied <= 0) return null;

  const nextSegment: SelectedCopySegment = {
    ...segment,
    originStart: getSegmentOriginStart(segment),
    originEnd: getSegmentOriginEnd(segment),
  };
  const EPS = 1e-3;

  if (edge === 'start') {
    const targetStart = Math.max(0, segment.start - applied);
    // 扩展窗口内新出现的字（按字起点落在 [targetStart, segment.start)）
    const addedWords = transcriptWords.filter(
      (word) => word.start >= targetStart - EPS && word.start < segment.start - EPS
    );
    if (addedWords.length) {
      const prefix = addedWords.map((word) => word.text).join('');
      nextSegment.text = `${prefix}${segment.text}`;
      nextSegment.start = Math.min(addedWords[0]!.start, segment.end - MIN_SEGMENT_DURATION);
    } else {
      nextSegment.start = Math.min(targetStart, segment.end - MIN_SEGMENT_DURATION);
    }
  } else {
    const targetEnd =
      Number.isFinite(videoDuration) && videoDuration > 0
        ? Math.min(videoDuration, segment.end + applied)
        : segment.end + applied;
    const addedWords = transcriptWords.filter(
      (word) => word.start >= segment.end - EPS && word.start < targetEnd - EPS
    );
    if (addedWords.length) {
      const suffix = addedWords.map((word) => word.text).join('');
      nextSegment.text = `${segment.text}${suffix}`;
      const last = addedWords[addedWords.length - 1]!;
      nextSegment.end = Math.max(last.end, segment.start + MIN_SEGMENT_DURATION);
    } else {
      nextSegment.end = Math.max(targetEnd, segment.start + MIN_SEGMENT_DURATION);
    }
  }

  // 再次钳制邻居与单侧最多 +0.5s
  if (edge === 'start') {
    const prev = index > 0 ? segments[index - 1] : null;
    const lowerBound = prev ? prev.end : 0;
    const minStartByBudget = nextSegment.originStart! - SEGMENT_EXTEND_MAX_SEC;
    nextSegment.start = Math.max(nextSegment.start, lowerBound, minStartByBudget);
  } else {
    const next = index < segments.length - 1 ? segments[index + 1] : null;
    const maxEndByBudget = nextSegment.originEnd! + SEGMENT_EXTEND_MAX_SEC;
    let upper = maxEndByBudget;
    if (next) upper = Math.min(upper, next.start);
    if (Number.isFinite(videoDuration) && videoDuration > 0) {
      upper = Math.min(upper, videoDuration);
    }
    nextSegment.end = Math.min(nextSegment.end, upper);
  }

  if (
    nextSegment.start >= nextSegment.end - EPS ||
    (Math.abs(nextSegment.start - segment.start) < EPS &&
      Math.abs(nextSegment.end - segment.end) < EPS &&
      nextSegment.text === segment.text)
  ) {
    return null;
  }

  const next = [...segments];
  next[index] = nextSegment;
  const actualApplied =
    edge === 'start' ? segment.start - nextSegment.start : nextSegment.end - segment.end;

  return { segments: next, applied: Math.max(0, actualApplied) };
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

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** 生成用于 dangerouslySetInnerHTML 的高亮 HTML；先转义再包 mark，避免 XSS */
export function highlightKeyword(text: string, keyword: string) {
  const safeText = escapeHtml(text);
  if (!keyword.trim()) return safeText;

  const safeKeyword = escapeHtml(keyword);
  const escaped = safeKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  return safeText.replace(regex, '<mark>$1</mark>');
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

const FOLLOW_COMFORT_TOP_RATIO = 0.24;
const FOLLOW_COMFORT_BOTTOM_RATIO = 0.68;

/** 播放跟随时，仅在目标离开舒适区时做最小增量滚动，避免段落切换大幅跳转 */
export function scrollFollowElement(
  container: HTMLElement,
  element: HTMLElement,
  options?: { behavior?: ScrollBehavior }
) {
  const behavior = options?.behavior ?? 'smooth';
  const containerRect = container.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();
  const comfortTop = containerRect.top + container.clientHeight * FOLLOW_COMFORT_TOP_RATIO;
  const comfortBottom = containerRect.top + container.clientHeight * FOLLOW_COMFORT_BOTTOM_RATIO;
  const elementTop = elementRect.top;
  const elementBottom = elementRect.bottom;

  if (elementTop >= comfortTop && elementBottom <= comfortBottom) {
    return false;
  }

  let scrollDelta = 0;
  if (elementBottom > comfortBottom) {
    scrollDelta = elementBottom - comfortBottom;
  } else if (elementTop < comfortTop) {
    scrollDelta = elementTop - comfortTop;
  }

  if (Math.abs(scrollDelta) < 6) {
    return false;
  }

  container.scrollBy({ top: scrollDelta, behavior });
  return true;
}
