import type { MockMethod } from 'vite-plugin-mock';
import { API_PREFIX } from './_config';
import {
  clipTaskStore,
  deleteClipTask,
  toPublicClipTask,
  updateClipTaskName,
} from './clipTaskStore';

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

function filterClipTasks(query: Record<string, string | string[] | undefined>) {
  const date = typeof query.date === 'string' ? query.date : undefined;
  const dateEnd = typeof query.dateEnd === 'string' ? query.dateEnd : undefined;
  const keyword = typeof query.keyword === 'string' ? query.keyword : undefined;
  const status = typeof query.status === 'string' ? query.status : undefined;
  const titleKeywords = parseKeywords(keyword);

  return clipTaskStore.filter((task) => {
    const createdDate = task.createdAt.slice(0, 10);
    if (date && createdDate < date) return false;
    if (dateEnd && createdDate > dateEnd) return false;
    if (status && task.status !== status) return false;

    const titleText = `${task.sourceVideoName} ${task.clipName}`;
    if (!matchKeywords(titleText, titleKeywords)) return false;

    return true;
  });
}

export default [
  {
    url: `${API_PREFIX}/v1/clip-tasks`,
    method: 'get',
    response: ({ query }: { query: Record<string, string | string[] | undefined> }) => {
      const filtered = filterClipTasks(query);
      const page = Number(query.page || 1);
      const pageSize = Number(query.pageSize || 10);
      const start = (page - 1) * pageSize;

      return {
        code: 0,
        message: '',
        data: {
          list: filtered.slice(start, start + pageSize).map(toPublicClipTask),
          total: filtered.length,
        },
      };
    },
  },
  {
    url: `${API_PREFIX}/v1/clip-tasks/:id`,
    method: 'get',
    response: ({ query }: { query: { id: string } }) => {
      const task = clipTaskStore.find((item) => item.taskId === query.id);
      if (!task) {
        return { code: 404, message: '任务不存在', data: null };
      }
      return { code: 0, message: '', data: toPublicClipTask(task) };
    },
  },
  {
    url: `${API_PREFIX}/v1/clip-tasks/:id/name`,
    method: 'put',
    response: ({ body, query }: { body: { clipName?: string }; query: { id: string } }) => {
      const clipName = body?.clipName?.trim();
      if (!clipName) {
        return { code: 400, message: '成片名称不能为空', data: null };
      }

      const task = updateClipTaskName(query.id, clipName);
      if (!task) {
        return { code: 404, message: '任务不存在', data: null };
      }

      return { code: 0, message: '', data: toPublicClipTask(task) };
    },
  },
  {
    url: `${API_PREFIX}/v1/clip-tasks/:id`,
    method: 'delete',
    response: ({ query }: { query: { id: string } }) => {
      const deleted = deleteClipTask(query.id);
      if (!deleted) {
        return { code: 404, message: '任务不存在', data: null };
      }
      return { code: 0, message: '', data: null };
    },
  },
] as MockMethod[];
