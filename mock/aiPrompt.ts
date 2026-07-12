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

const PROMPT_TEMPLATES = [
  { name: '同商品连贯性', content: '确保生成的视频整体都是在讲同一个商品确保生成的视频整体都是在讲同一个商品确保生成的视频整体都是在讲同一个商品确保生成的视频整体都是在讲同一个商品确保生成的视频整体都是在讲同一个商品', remark: '时间轴切片默认提示词' },
  { name: '人工文案成片', content: '根据人工选择的文案片段生成成片', remark: '人工切片场景' },
  { name: '高光集锦', content: '提取直播中最有感染力和转化力的片段，生成 30 秒以内的短视频', remark: '' },
  { name: '开场引流', content: '保留直播开场 30 秒内最具吸引力的内容，突出主题与福利信息', remark: '' },
  { name: '产品卖点提炼', content: '围绕单一商品提取核心卖点，去除无关闲聊与重复话术', remark: '' },
  { name: '价格促销强调', content: '聚焦限时优惠、赠品与下单引导，形成高转化短视频', remark: '' },
  { name: '用户互动精选', content: '保留主播与观众互动中最有共鸣的问答片段', remark: '' },
  { name: '场景氛围感', content: '突出画面氛围与情绪表达，适合旅游、探店类内容', remark: '' },
  { name: '教程步骤精简', content: '按步骤提取教学重点，保证逻辑连贯、节奏紧凑', remark: '' },
  { name: '对比测评', content: '保留产品对比与实测结论，突出差异与推荐理由', remark: '' },
  { name: '故事化表达', content: '以故事线串联片段，让成片更具观看连续性', remark: '' },
  { name: '口播金句', content: '提取主播口播中最有记忆点的金句与观点', remark: '' },
  { name: '多片段串联', content: '将多个相关片段按时间顺序串联，形成完整叙事', remark: '' },
  { name: '竖屏短视频', content: '优先保留人物居中、画面稳定的片段，适配竖屏发布', remark: '' },
  { name: '品牌调性', content: '保持语言风格与品牌调性一致，避免过于口语化的冗余表达', remark: '' },
  { name: '结尾引导', content: '保留直播结尾的总结、福利提醒与关注引导', remark: '' },
  { name: '痛点共鸣', content: '围绕用户痛点展开，突出问题与解决方案', remark: '' },
  { name: '节奏加速', content: '去除停顿与无效片段，让成片节奏更快、信息密度更高', remark: '' },
  { name: '字幕友好', content: '优先选择口播清晰、背景噪音较少的片段', remark: '' },
  { name: '本地生活探店', content: '突出门店环境、特色菜品与消费体验，适合本地生活推广', remark: '' },
  { name: '游戏高光', content: '提取游戏直播中的精彩操作与反转瞬间', remark: '' },
  { name: '母婴种草', content: '围绕母婴产品使用场景与真实体验进行内容提炼', remark: '' },
];

function buildMockAiPrompts(): MockAiPrompt[] {
  return PROMPT_TEMPLATES.map((item, index) => {
    const id = String(index + 1).padStart(3, '0');
    const day = String((index % 28) + 1).padStart(2, '0');

    return {
      id: `prompt-${id}`,
      name: item.name,
      content: item.content,
      remark: item.remark,
      creatorName: CURRENT_USER_NAME,
      createdAt: `2026-06-${day} 10:00:00`,
      updatedAt: `2026-06-${day} 10:00:00`,
      ownerId: CURRENT_USER_ID,
    };
  });
}

const aiPrompts: MockAiPrompt[] = [
  ...buildMockAiPrompts(),
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
    url: `${API_PREFIX}/v1/ai-prompts/:id`,
    method: 'put',
    response: ({
      body,
      query,
    }: {
      body: {
        name?: string;
        content?: string;
        remark?: string;
      };
      query: { id: string };
    }) => {
      const item = aiPrompts.find((prompt) => prompt.id === query.id && prompt.ownerId === CURRENT_USER_ID);
      if (!item) {
        return { code: 404, message: '提示词不存在', data: null };
      }

      const name = body?.name?.trim();
      const content = body?.content?.trim();
      if (!name || !content) {
        return { code: 400, message: '请填写名称和提示词信息', data: null };
      }

      item.name = name;
      item.content = content;
      item.remark = body.remark?.trim() || '';
      item.updatedAt = formatNow();

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
