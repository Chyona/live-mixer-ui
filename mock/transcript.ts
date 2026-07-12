import type { MockMethod } from 'vite-plugin-mock';
import { API_PREFIX } from './_config';
import type {
  ManualSliceDraft,
  SelectedCopySegment,
  TranscriptParagraph,
  VideoTranscript,
} from '../src/pages/ManualVideoSlice/types';

const SPEAKERS = [
  { id: 'host', name: '主播' },
  { id: 'guest', name: '嘉宾' },
];

const SCRIPT_LINES: Array<{ speakerId: string; text: string; duration: number }> = [
  { speakerId: 'host', text: '大家好，欢迎来到今天的直播专场。', duration: 4 },
  { speakerId: 'host', text: '今天给大家带来的是春季上新系列，性价比非常高。', duration: 5 },
  { speakerId: 'guest', text: '是的，这一季我们重点升级了面料和版型。', duration: 4.5 },
  { speakerId: 'guest', text: '很多老用户反馈上身效果比上一代更舒适。', duration: 4.5 },
  { speakerId: 'host', text: '我们先看第一款爆款，经典百搭款，适合日常通勤。', duration: 5 },
  { speakerId: 'host', text: '现在下单还有限时优惠，库存真的不多。', duration: 4.5 },
  { speakerId: 'guest', text: '这个颜色今年特别受欢迎，显白又高级。', duration: 4 },
  { speakerId: 'host', text: '评论区已经有朋友在问尺码问题了。', duration: 3.5 },
  { speakerId: 'host', text: '建议按照平时尺码选择，偏宽松可以选小一码。', duration: 4.5 },
  { speakerId: 'guest', text: '另外搭配这条围巾，整体层次感会更好。', duration: 4 },
  { speakerId: 'host', text: '接下来这款是今天的主推，限时秒杀价。', duration: 4.5 },
  { speakerId: 'host', text: '它的核心卖点是轻便、防泼水，非常适合户外。', duration: 5 },
  { speakerId: 'guest', text: '我们现场做了一个小测试，泼水几乎不留痕。', duration: 4.5 },
  { speakerId: 'host', text: '想要的朋友可以直接点购物车，手慢无。', duration: 4 },
  { speakerId: 'guest', text: '售后方面同样支持七天无理由，大家放心买。', duration: 4.5 },
  { speakerId: 'host', text: '最后提醒一下，关注直播间可领额外优惠券。', duration: 4.5 },
  { speakerId: 'host', text: '感谢大家的支持，我们下一轮福利马上开始。', duration: 4.5 },
];

function splitToSegments(text: string, start: number, end: number) {
  const parts = text.split(/(?<=[，。！？；])/g).filter(Boolean);
  if (parts.length <= 1) {
    return [{ id: `${start}-${end}`, start, end, text }];
  }

  const duration = end - start;
  let cursor = start;

  return parts.map((part, index) => {
    const ratio = part.length / text.length;
    const segmentEnd = index === parts.length - 1 ? end : cursor + duration * ratio;
    const segment = {
      id: `${start}-${index}`,
      start: cursor,
      end: segmentEnd,
      text: part,
    };
    cursor = segmentEnd;
    return segment;
  });
}

function buildTranscript(sourceVideoId: string, duration = 600): VideoTranscript {
  const paragraphs: TranscriptParagraph[] = [];
  let cursor = 0;
  let lineIndex = 0;

  while (cursor < duration - 2 && lineIndex < SCRIPT_LINES.length * 20) {
    const line = SCRIPT_LINES[lineIndex % SCRIPT_LINES.length];
    const speaker = SPEAKERS.find((item) => item.id === line.speakerId) ?? SPEAKERS[0];
    const lineDuration = Math.min(line.duration, duration - cursor);
    const end = cursor + lineDuration;

    paragraphs.push({
      id: `p-${paragraphs.length + 1}`,
      speakerId: speaker.id,
      speakerName: speaker.name,
      segments: splitToSegments(line.text, cursor, end),
    });

    cursor = end + 0.3;
    lineIndex += 1;
  }

  return { sourceVideoId, paragraphs };
}

const transcriptCache = new Map<string, VideoTranscript>();
const draftStore = new Map<string, ManualSliceDraft[]>();

function getTranscript(sourceVideoId: string) {
  if (!transcriptCache.has(sourceVideoId)) {
    transcriptCache.set(sourceVideoId, buildTranscript(sourceVideoId));
  }
  return transcriptCache.get(sourceVideoId)!;
}

function overlapsRange(start: number, end: number, clipStart: number, clipEnd: number) {
  return end > clipStart && start < clipEnd;
}

function buildAiSelectedSegments(
  transcript: VideoTranscript,
  clips: Array<{ start: number; end: number }>
): SelectedCopySegment[] {
  const selected: SelectedCopySegment[] = [];
  const seen = new Set<string>();

  for (const clip of clips) {
    for (const paragraph of transcript.paragraphs) {
      for (const segment of paragraph.segments) {
        if (!overlapsRange(segment.start, segment.end, clip.start, clip.end)) continue;
        if (seen.has(segment.id)) continue;

        seen.add(segment.id);
        selected.push({
          id: segment.id,
          speakerId: paragraph.speakerId,
          speakerName: paragraph.speakerName,
          text: segment.text,
          start: segment.start,
          end: segment.end,
        });
      }
    }
  }

  return selected.sort((a, b) => a.start - b.start);
}

export default [
  {
    url: `${API_PREFIX}/v1/source-videos/:id/transcript`,
    method: 'get',
    response: ({ query }: { query: { id: string } }) => {
      const transcript = getTranscript(query.id);
      return { code: 0, message: '', data: transcript };
    },
  },
  {
    url: `${API_PREFIX}/v1/source-videos/:id/manual-slice-drafts`,
    method: 'get',
    response: ({ query }: { query: { id: string } }) => {
      return {
        code: 0,
        message: '',
        data: draftStore.get(query.id) ?? [],
      };
    },
  },
  {
    url: `${API_PREFIX}/v1/source-videos/:id/manual-slice-drafts`,
    method: 'post',
    response: ({
      body,
      query,
    }: {
      body: { name?: string; segments?: ManualSliceDraft['segments'] };
      query: { id: string };
    }) => {
      const name = body?.name?.trim();
      if (!name) {
        return { code: 400, message: '请输入草稿名称', data: null };
      }

      const draft: ManualSliceDraft = {
        id: `draft-${Date.now()}`,
        name,
        sourceVideoId: query.id,
        segments: body?.segments ?? [],
        updatedAt: new Date().toISOString(),
      };

      const list = draftStore.get(query.id) ?? [];
      list.unshift(draft);
      draftStore.set(query.id, list);

      return { code: 0, message: '', data: draft };
    },
  },
  {
    url: `${API_PREFIX}/v1/source-videos/:id/ai-slice-select`,
    method: 'post',
    response: ({
      body,
      query,
    }: {
      body: {
        prompt?: string;
        promptId?: string;
        clips?: Array<{ start: number; end: number }>;
      };
      query: { id: string };
    }) => {
      const prompt = body?.prompt?.trim();
      const clips = body?.clips ?? [];

      if (!prompt) {
        return { code: 400, message: '请选择 AI 提示词', data: null };
      }

      if (!clips.length) {
        return { code: 400, message: '请选择至少一个时间片段', data: null };
      }

      const transcript = getTranscript(query.id);
      const segments = buildAiSelectedSegments(transcript, clips);

      if (!segments.length) {
        return { code: 400, message: '所选时间范围内未匹配到文案片段', data: null };
      }

      return {
        code: 0,
        message: '',
        data: { segments },
      };
    },
  },
] as MockMethod[];
