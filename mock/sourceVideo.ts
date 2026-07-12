import type { MockMethod } from 'vite-plugin-mock';
import { API_PREFIX } from './_config';
import { LIVE_URL } from './_Live_URL';

type MockSourceVideo = {
  id: number;
  name: string;
  live_url: string;
  remark: string;
  duration: number;
  ext: string;
  live_asr: string;
  asr_status: 'pending' | 'processing' | 'success' | 'failed';
  asr_progress: number;
  created_at: string;
  updated_at: string;
  created_by: number;
  ownerId: string;
};

const CURRENT_USER_ID = '222';

const MOCK_LIVE_TEMPLATES = [
  { name: '周末游戏直播回放', remark: '游戏专场素材' },
  { name: '新品发布会直播', remark: '发布会实录' },
  { name: '户外探店直播', remark: '探店精选' },
  { name: '美食烹饪教学', remark: '厨房直播' },
  { name: '数码产品测评', remark: '测评专场' },
  { name: '音乐演唱会直播', remark: '演唱会素材' },
  { name: '健身跟练直播', remark: '运动健身' },
  { name: '旅游风景直播', remark: '风景记录' },
  { name: '电商带货专场', remark: '带货素材' },
  { name: '访谈节目直播', remark: '访谈备用' },
  { name: '校园活动直播', remark: '校园活动' },
  { name: '科技峰会直播', remark: '峰会实录' },
  { name: '宠物日常直播', remark: '萌宠日常' },
  { name: '手工制作教学', remark: '手工教学' },
  { name: '读书分享会', remark: '读书分享' },
  { name: '汽车试驾直播', remark: '试驾记录' },
  { name: '时装秀场直播', remark: '秀场素材' },
  { name: '电竞赛事直播', remark: '赛事回放' },
  { name: '农业科普直播', remark: '科普专场' },
  { name: '城市夜景直播', remark: '夜景素材' },
];

const DEMO_VIDEO_URLS = [...LIVE_URL];

function isoAt(day: string, hour = 10) {
  return `2026-06-${day}T${String(hour).padStart(2, '0')}:00:00.000Z`;
}

function buildMockSourceVideos(): MockSourceVideo[] {
  return MOCK_LIVE_TEMPLATES.map((item, index) => {
    const id = index + 1;
    const day = String((index % 28) + 1).padStart(2, '0');
    const created_at = isoAt(day);
    const failed = index % 4 === 0;

    return {
      id,
      name: item.name,
      live_url: DEMO_VIDEO_URLS[index % DEMO_VIDEO_URLS.length],
      remark: item.remark,
      duration: failed ? 0 : 3600 + index * 317,
      ext: '',
      live_asr: failed
        ? JSON.stringify({ message: '转写服务超时，请稍后重试' })
        : '{}',
      asr_status: failed ? 'failed' : 'success',
      asr_progress: failed ? 36 : 100,
      created_at,
      updated_at: created_at,
      created_by: 1,
      ownerId: CURRENT_USER_ID,
    };
  });
}

const sourceVideos: MockSourceVideo[] = [
  ...buildMockSourceVideos(),
  {
    id: 999,
    name: '其他用户直播素材',
    live_url: 'rtmp://live.example.com/stream/other',
    remark: '不应展示',
    duration: 1200,
    ext: '',
    live_asr: '{}',
    asr_status: 'success',
    asr_progress: 100,
    created_at: isoAt('05', 12),
    updated_at: isoAt('05', 12),
    created_by: 2,
    ownerId: 'other-user',
  },
];

function parseKeywords(input?: string) {
  if (!input?.trim()) return [];
  return input
    .split(/[+＋]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function matchKeywords(text: string, keywords: string[]) {
  if (!keywords.length) return true;
  const lower = text.toLowerCase();
  return keywords.every((keyword) => lower.includes(keyword.toLowerCase()));
}

function toPublicItem(item: MockSourceVideo) {
  const { ownerId: _ownerId, ...rest } = item;
  return rest;
}

function advanceAsrProgress(item: MockSourceVideo) {
  if (item.asr_status === 'success' || item.asr_status === 'failed') return;

  if (item.asr_status === 'pending') {
    item.asr_status = 'processing';
    item.asr_progress = 8;
    return;
  }

  item.asr_progress = Math.min(100, item.asr_progress + 10 + Math.floor(Math.random() * 10));

  if (item.asr_progress >= 100) {
    item.asr_progress = 100;
    item.asr_status = 'success';
    item.live_asr = '{}';
    if (item.duration === 0) {
      item.duration = 1800 + Math.floor(Math.random() * 3600);
    }
  }

  item.updated_at = new Date().toISOString();
}

function tickAllAsrJobs() {
  sourceVideos.forEach((item) => {
    if (item.ownerId !== CURRENT_USER_ID) return;
    advanceAsrProgress(item);
  });
}

function filterList(query: Record<string, string | string[] | undefined>) {
  const date = typeof query.date === 'string' ? query.date : undefined;
  const dateEnd = typeof query.dateEnd === 'string' ? query.dateEnd : undefined;
  const keyword = typeof query.keyword === 'string' ? query.keyword : undefined;
  const globalKeyword = typeof query.globalKeyword === 'string' ? query.globalKeyword : undefined;
  const titleKeywords = parseKeywords(keyword);
  const globalKeywords = parseKeywords(globalKeyword);

  return sourceVideos.filter((item) => {
    if (item.ownerId !== CURRENT_USER_ID) return false;

    const createdDate = item.created_at.slice(0, 10);
    if (date && createdDate < date) return false;
    if (dateEnd && createdDate > dateEnd) return false;

    const titleText = `${item.name} ${item.remark}`;
    if (!matchKeywords(titleText, titleKeywords)) return false;

    const globalText = `${item.name} ${item.remark} ${item.live_url} ${createdDate}`;
    if (!matchKeywords(globalText, globalKeywords)) return false;

    return true;
  });
}

export default [
  {
    url: `${API_PREFIX}/v1/live-materials`,
    method: 'get',
    response: ({ query }: { query: Record<string, string | string[] | undefined> }) => {
      tickAllAsrJobs();
      const page = Number(query.page || 1);
      const pageSize = Number(query.pageSize || 10);
      const filtered = filterList(query);
      const start = (page - 1) * pageSize;

      return {
        code: 0,
        message: '',
        data: {
          list: filtered.slice(start, start + pageSize).map(toPublicItem),
          total: filtered.length,
        },
      };
    },
  },
  {
    url: `${API_PREFIX}/v1/live-materials`,
    method: 'post',
    response: ({
      body,
    }: {
      body: {
        name?: string;
        live_url?: string;
        remark?: string;
      };
    }) => {
      const name = body?.name?.trim();
      const live_url = body?.live_url?.trim();

      if (!name || !live_url) {
        return { code: 400, message: '请填写完整信息', data: null };
      }

      const now = new Date().toISOString();
      const item: MockSourceVideo = {
        id: Date.now(),
        name,
        live_url,
        remark: body.remark?.trim() || '',
        duration: 0,
        ext: '',
        live_asr: '{}',
        asr_status: 'pending',
        asr_progress: 0,
        created_at: now,
        updated_at: now,
        created_by: 1,
        ownerId: CURRENT_USER_ID,
      };

      sourceVideos.unshift(item);

      return { code: 0, message: '', data: toPublicItem(item) };
    },
  },
  {
    url: `${API_PREFIX}/v1/live-materials/:id`,
    method: 'get',
    response: ({ query }: { query: { id: string } }) => {
      tickAllAsrJobs();
      const item = sourceVideos.find(
        (video) => String(video.id) === query.id && video.ownerId === CURRENT_USER_ID
      );
      if (!item) {
        return { code: 404, message: '源视频不存在', data: null };
      }
      return { code: 0, message: '', data: toPublicItem(item) };
    },
  },
  {
    url: `${API_PREFIX}/v1/live-materials/:id/remark`,
    method: 'put',
    response: ({ body, query }: { body: { remark?: string }; query: { id: string } }) => {
      const item = sourceVideos.find(
        (video) => String(video.id) === query.id && video.ownerId === CURRENT_USER_ID
      );
      if (!item) {
        return { code: 404, message: '源视频不存在', data: null };
      }
      item.remark = body?.remark?.trim() || '';
      item.updated_at = new Date().toISOString();
      return { code: 0, message: '', data: toPublicItem(item) };
    },
  },
  {
    url: `${API_PREFIX}/v1/live-materials/:id`,
    method: 'delete',
    response: ({ query }: { query: { id: string } }) => {
      const index = sourceVideos.findIndex(
        (video) => String(video.id) === query.id && video.ownerId === CURRENT_USER_ID
      );
      if (index < 0) {
        return { code: 404, message: '源视频不存在', data: null };
      }
      sourceVideos.splice(index, 1);
      return { code: 0, message: '', data: null };
    },
  },
  {
    url: `${API_PREFIX}/v1/live-materials/:id/asr/retry`,
    method: 'post',
    response: ({ query }: { query: { id: string } }) => {
      const item = sourceVideos.find(
        (video) => String(video.id) === query.id && video.ownerId === CURRENT_USER_ID
      );
      if (!item) {
        return { code: 404, message: '源视频不存在', data: null };
      }
      if (item.asr_status !== 'failed') {
        return { code: 400, message: '当前 ASR 状态不可重新解析', data: null };
      }

      item.asr_status = 'pending';
      item.asr_progress = 0;
      item.live_asr = '{}';
      item.updated_at = new Date().toISOString();

      return { code: 0, message: '', data: toPublicItem(item) };
    },
  },
] as MockMethod[];
