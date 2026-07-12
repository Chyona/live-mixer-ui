import type { MockMethod } from 'vite-plugin-mock';
import { API_PREFIX } from './_config';
import { listSliceProjects, updateSliceProjectName } from './sliceProjectStore';

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

export default [
  {
    url: `${API_PREFIX}/v1/slice-projects`,
    method: 'get',
    response: ({ query }: { query: Record<string, string | string[] | undefined> }) => {
      const date = typeof query.date === 'string' ? query.date : undefined;
      const dateEnd = typeof query.dateEnd === 'string' ? query.dateEnd : undefined;
      const keyword = typeof query.keyword === 'string' ? query.keyword : undefined;
      const page = Number(query.page || 1);
      const pageSize = Number(query.pageSize || 10);
      const titleKeywords = parseKeywords(keyword);

      const filtered = listSliceProjects().filter((item) => {
        const updatedDate = item.updatedAt.slice(0, 10);
        if (date && updatedDate < date) return false;
        if (dateEnd && updatedDate > dateEnd) return false;

        const titleText = `${item.projectName} ${item.sourceVideoName} ${item.remarkName}`;
        return matchKeywords(titleText, titleKeywords);
      });

      const start = (page - 1) * pageSize;

      return {
        code: 0,
        message: '',
        data: {
          list: filtered.slice(start, start + pageSize),
          total: filtered.length,
        },
      };
    },
  },
  {
    url: `${API_PREFIX}/v1/slice-projects/:id/name`,
    method: 'put',
    response: ({ body, query }: { body: { projectName?: string }; query: { id: string } }) => {
      const projectName = body?.projectName?.trim();
      if (!projectName) {
        return { code: 400, message: '项目名称不能为空', data: null };
      }

      const project = updateSliceProjectName(query.id, projectName);
      if (!project) {
        return { code: 404, message: '剪辑项目不存在', data: null };
      }

      return { code: 0, message: '', data: project };
    },
  },
] as MockMethod[];
