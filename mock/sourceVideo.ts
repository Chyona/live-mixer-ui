import type { MockMethod } from 'vite-plugin-mock';
import { API_PREFIX } from './_config';
import { LIVE_URL } from './_Live_URL';

type MockSourceVideo = {
  id: string;
  name: string;
  liveUrl: string;
  remarkName: string;
  duration: number;
  date: string;
  segmentCount: number;
  clipCount: number;
  sourceType: 'live' | 'import';
  ownerId: string;
};

const CURRENT_USER_ID = '222';

const MOCK_LIVE_TEMPLATES = [
  { name: '周末游戏直播回放', remarkName: '游戏专场素材' },
  { name: '新品发布会直播', remarkName: '发布会实录' },
  { name: '户外探店直播', remarkName: '探店精选' },
  { name: '美食烹饪教学', remarkName: '厨房直播' },
  { name: '数码产品测评', remarkName: '测评专场' },
  { name: '音乐演唱会直播', remarkName: '演唱会素材' },
  { name: '健身跟练直播', remarkName: '运动健身' },
  { name: '旅游风景直播', remarkName: '风景记录' },
  { name: '电商带货专场', remarkName: '带货素材' },
  { name: '访谈节目直播', remarkName: '访谈备用' },
  { name: '校园活动直播', remarkName: '校园活动' },
  { name: '科技峰会直播', remarkName: '峰会实录' },
  { name: '宠物日常直播', remarkName: '萌宠日常' },
  { name: '手工制作教学', remarkName: '手工教学' },
  { name: '读书分享会', remarkName: '读书分享' },
  { name: '汽车试驾直播', remarkName: '试驾记录' },
  { name: '时装秀场直播', remarkName: '秀场素材' },
  { name: '电竞赛事直播', remarkName: '赛事回放' },
  { name: '农业科普直播', remarkName: '科普专场' },
  { name: '城市夜景直播', remarkName: '夜景素材' },
];

const DEMO_VIDEO_URLS = [
  'http://vjs.zencdn.net/v/oceans.mp4',
  'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
  ...LIVE_URL,
];

function buildMockSourceVideos(): MockSourceVideo[] {
  return MOCK_LIVE_TEMPLATES.map((item, index) => {
    const id = String(index + 1).padStart(3, '0');
    const day = String((index % 28) + 1).padStart(2, '0');

    return {
      id: `sv-${id}`,
      name: item.name,
      liveUrl: DEMO_VIDEO_URLS[index % DEMO_VIDEO_URLS.length],
      remarkName: item.remarkName,
      duration: 3600 + index * 317,
      date: `2026-06-${day}`,
      segmentCount: 3 + (index % 12),
      clipCount: 8 + (index % 20),
      sourceType: 'live',
      ownerId: CURRENT_USER_ID,
    };
  });
}

const sourceVideos: MockSourceVideo[] = [
  ...buildMockSourceVideos(),
  {
    id: 'sv-999',
    name: '其他用户直播素材',
    liveUrl: 'rtmp://live.example.com/stream/other',
    remarkName: '不应展示',
    duration: 1200,
    date: '2026-07-05',
    segmentCount: 2,
    clipCount: 4,
    sourceType: 'live',
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

function filterList(query: Record<string, string | string[] | undefined>) {
  const date = typeof query.date === 'string' ? query.date : undefined;
  const dateEnd = typeof query.dateEnd === 'string' ? query.dateEnd : undefined;
  const keyword = typeof query.keyword === 'string' ? query.keyword : undefined;
  const globalKeyword = typeof query.globalKeyword === 'string' ? query.globalKeyword : undefined;
  const titleKeywords = parseKeywords(keyword);
  const globalKeywords = parseKeywords(globalKeyword);

  return sourceVideos.filter((item) => {
    if (item.ownerId !== CURRENT_USER_ID) return false;

    if (date && item.date < date) return false;
    if (dateEnd && item.date > dateEnd) return false;

    const titleText = `${item.name} ${item.remarkName}`;
    if (!matchKeywords(titleText, titleKeywords)) return false;

    const globalText = `${item.name} ${item.remarkName} ${item.liveUrl} ${item.date} ${item.sourceType}`;
    if (!matchKeywords(globalText, globalKeywords)) return false;

    return true;
  });
}

export default [
  {
    url: `${API_PREFIX}/v1/source-videos`,
    method: 'get',
    response: ({ query }: { query: Record<string, string | string[] | undefined> }) => {
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
    url: `${API_PREFIX}/v1/source-videos`,
    method: 'post',
    response: ({
      body,
    }: {
      body: {
        name?: string;
        liveUrl?: string;
        remarkName?: string;
        date?: string;
        sourceType?: 'live' | 'import';
        duration?: number;
      };
    }) => {
      const name = body?.name?.trim();
      const liveUrl = body?.liveUrl?.trim();
      const date = body?.date?.trim();
      const sourceType = body?.sourceType === 'import' ? 'import' : 'live';

      if (!name || !liveUrl || !date) {
        return { code: 400, message: '请填写完整信息', data: null };
      }

      const item: MockSourceVideo = {
        id: `sv-${Date.now()}`,
        name,
        liveUrl,
        remarkName: body.remarkName?.trim() || '',
        duration: body.duration || 0,
        date,
        segmentCount: 0,
        clipCount: 0,
        sourceType,
        ownerId: CURRENT_USER_ID,
      };

      sourceVideos.unshift(item);

      return { code: 0, message: '', data: toPublicItem(item) };
    },
  },
  {
    url: `${API_PREFIX}/v1/source-videos/:id`,
    method: 'get',
    response: ({ query }: { query: { id: string } }) => {
      const item = sourceVideos.find(
        (video) => video.id === query.id && video.ownerId === CURRENT_USER_ID
      );
      if (!item) {
        return { code: 404, message: '源视频不存在', data: null };
      }
      return { code: 0, message: '', data: toPublicItem(item) };
    },
  },
  {
    url: `${API_PREFIX}/v1/source-videos/:id/remark`,
    method: 'put',
    response: ({ body, query }: { body: { remarkName?: string }; query: { id: string } }) => {
      const item = sourceVideos.find((video) => video.id === query.id && video.ownerId === CURRENT_USER_ID);
      if (!item) {
        return { code: 404, message: '源视频不存在', data: null };
      }
      item.remarkName = body?.remarkName?.trim() || '';
      return { code: 0, message: '', data: toPublicItem(item) };
    },
  },
  {
    url: `${API_PREFIX}/v1/source-videos/:id`,
    method: 'delete',
    response: ({ query }: { query: { id: string } }) => {
      const index = sourceVideos.findIndex(
        (video) => video.id === query.id && video.ownerId === CURRENT_USER_ID
      );
      if (index < 0) {
        return { code: 404, message: '源视频不存在', data: null };
      }
      sourceVideos.splice(index, 1);
      return { code: 0, message: '', data: null };
    },
  },
] as MockMethod[];
