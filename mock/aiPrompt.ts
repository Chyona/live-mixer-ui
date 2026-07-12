import type { MockMethod } from 'vite-plugin-mock';
import { API_PREFIX } from './_config';

type MockAiPrompt = {
  id: string;
  name: string;
  content: string;
  remark: string;
  creatorName: string;
  createdAt: string;
  updatedAt: string;
  ownerId: string;
};

const CURRENT_USER_ID = '222';
const CURRENT_USER_NAME = 'userName';

const aiPrompts: MockAiPrompt[] = [
  {
    id: 'prompt-001',
    name: '同商品连贯性',
    content: '确保生成的视频整体都是在讲同一个商品',
    remark: '时间轴切片默认提示词',
    creatorName: CURRENT_USER_NAME,
    createdAt: '2026-06-10 09:30:00',
    updatedAt: '2026-06-10 09:30:00',
    ownerId: CURRENT_USER_ID,
  },
  {
    id: 'prompt-002',
    name: '人工文案成片',
    content: '根据人工选择的文案片段生成成片',
    remark: '人工切片场景',
    creatorName: CURRENT_USER_NAME,
    createdAt: '2026-06-12 14:20:00',
    updatedAt: '2026-06-15 11:05:00',
    ownerId: CURRENT_USER_ID,
  },
  {
    id: 'prompt-003',
    name: '高光集锦',
    content: '提取直播中最有感染力和转化力的片段，生成 30 秒以内的短视频',
    remark: '',
    creatorName: CURRENT_USER_NAME,
    createdAt: '2026-06-18 16:45:00',
    updatedAt: '2026-06-18 16:45:00',
    ownerId: CURRENT_USER_ID,
  },
  {
    id: 'prompt-999',
    name: '其他用户提示词',
    content: '不应展示',
    remark: '',
    creatorName: 'otherUser',
    createdAt: '2026-06-01 10:00:00',
    updatedAt: '2026-06-01 10:00:00',
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

function toPublicItem(item: MockAiPrompt) {
  const { ownerId: _ownerId, ...rest } = item;
  return rest;
}

function formatNow() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

function filterList(query: Record<string, string | string[] | undefined>) {
  const keyword = typeof query.keyword === 'string' ? query.keyword : undefined;
  const keywords = parseKeywords(keyword);

  return aiPrompts.filter((item) => {
    if (item.ownerId !== CURRENT_USER_ID) return false;

    const searchText = `${item.name} ${item.content} ${item.remark} ${item.creatorName}`;
    return matchKeywords(searchText, keywords);
  });
}

export default [
  {
    url: `${API_PREFIX}/v1/ai-prompts`,
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
    url: `${API_PREFIX}/v1/ai-prompts`,
    method: 'post',
    response: ({
      body,
    }: {
      body: {
        name?: string;
        content?: string;
        remark?: string;
      };
    }) => {
      const name = body?.name?.trim();
      const content = body?.content?.trim();

      if (!name || !content) {
        return { code: 400, message: '请填写名称和提示词信息', data: null };
      }

      const now = formatNow();
      const item: MockAiPrompt = {
        id: `prompt-${Date.now()}`,
        name,
        content,
        remark: body.remark?.trim() || '',
        creatorName: CURRENT_USER_NAME,
        createdAt: now,
        updatedAt: now,
        ownerId: CURRENT_USER_ID,
      };

      aiPrompts.unshift(item);

      return { code: 0, message: '', data: toPublicItem(item) };
    },
  },
  {
    url: `${API_PREFIX}/v1/ai-prompts/:id/remark`,
    method: 'put',
    response: ({ body, query }: { body: { remark?: string }; query: { id: string } }) => {
      const item = aiPrompts.find((prompt) => prompt.id === query.id && prompt.ownerId === CURRENT_USER_ID);
      if (!item) {
        return { code: 404, message: '提示词不存在', data: null };
      }

      item.remark = body?.remark?.trim() || '';
      item.updatedAt = formatNow();

      return { code: 0, message: '', data: toPublicItem(item) };
    },
  },
  {
    url: `${API_PREFIX}/v1/ai-prompts/:id`,
    method: 'delete',
    response: ({ query }: { query: { id: string } }) => {
      const index = aiPrompts.findIndex(
        (prompt) => prompt.id === query.id && prompt.ownerId === CURRENT_USER_ID
      );
      if (index < 0) {
        return { code: 404, message: '提示词不存在', data: null };
      }

      aiPrompts.splice(index, 1);
      return { code: 0, message: '', data: null };
    },
  },
] as MockMethod[];
