import type { MockMethod } from 'vite-plugin-mock';
import { API_PREFIX } from './_config';
import type { SelectedCopySegment } from '../src/pages/ManualVideoSlice/types';
import {
  getSliceProject,
  listSliceProjects,
  saveSliceProjectRecord,
  toPublicSliceProject,
  updateSliceProjectName,
} from './sliceProjectStore';

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

      const filtered = listSliceProjects()
        .filter((item) => item.segments.length > 0)
        .filter((item) => {
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
          list: filtered.slice(start, start + pageSize).map((item) => toPublicSliceProject(item)),
          total: filtered.length,
        },
      };
    },
  },
  {
    url: `${API_PREFIX}/v1/slice-projects/:id`,
    method: 'get',
    response: ({ query }: { query: { id: string } }) => {
      const project = getSliceProject(query.id);
      if (!project) {
        return { code: 404, message: '剪辑项目不存在', data: null };
      }

      return {
        code: 0,
        message: '',
        data: toPublicSliceProject(project, { withSegments: true }),
      };
    },
  },
  {
    url: `${API_PREFIX}/v1/slice-projects/:id/save`,
    method: 'post',
    response: ({
      body,
      query,
    }: {
      body: {
        projectName?: string;
        sourceVideoName?: string;
        remarkName?: string;
        projectSource?: 'timeline' | 'manual';
        segments?: SelectedCopySegment[];
      };
      query: { id: string };
    }) => {
      const segments = body?.segments ?? [];
      if (!segments.length) {
        return { code: 400, message: '请先选择至少一个片段', data: null };
      }

      const project = saveSliceProjectRecord({
        sourceVideoId: query.id,
        sourceVideoName: body?.sourceVideoName,
        remarkName: body?.remarkName,
        projectName: body?.projectName,
        projectSource: body?.projectSource,
        segments,
      });

      return {
        code: 0,
        message: '',
        data: toPublicSliceProject(project, { withSegments: true }),
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

      return { code: 0, message: '', data: toPublicSliceProject(project) };
    },
  },
] as MockMethod[];
