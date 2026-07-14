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

function clipsToSegments(
  clips: Array<{ start_time?: number; end_time?: number }> | undefined,
  prefix: string
): SelectedCopySegment[] {
  if (!clips?.length) return [];
  return clips.map((clip, index) => {
    const start = (clip.start_time ?? 0) / 1000;
    const end = (clip.end_time ?? 0) / 1000;
    return {
      id: `${prefix}-${index}-${Math.round(start * 1000)}-${Math.round(end * 1000)}`,
      speakerId: '1',
      speakerName: '说话人1',
      text: '',
      start,
      end,
    };
  });
}

export default [
  {
    url: `${API_PREFIX}/v1/video-projects`,
    method: 'post',
    response: ({
      body,
    }: {
      body: {
        live_id?: number;
        name?: string;
        remark?: string;
        clips0?: Array<{ start_time: number; end_time: number }>;
        clips1?: Array<{ start_time: number; end_time: number }>;
      };
    }) => {
      const liveId = body?.live_id;
      const name = body?.name?.trim();
      if (liveId == null || Number.isNaN(Number(liveId))) {
        return { code: 400, message: '源视频 id 不能为空', data: null };
      }
      if (!name) {
        return { code: 400, message: '项目名称不能为空', data: null };
      }

      const timelineSegments = clipsToSegments(body?.clips0, 'timeline');
      const manualSegments = clipsToSegments(body?.clips1, 'manual');
      const segments = [...timelineSegments, ...manualSegments].sort((a, b) => a.start - b.start);
      if (!segments.length) {
        return { code: 400, message: '请先选择至少一个片段', data: null };
      }

      const sourceVideoId = String(liveId);
      const project = saveSliceProjectRecord({
        id: `project-${Date.now()}`,
        sourceVideoId,
        sourceVideoName: `源视频 ${sourceVideoId}`,
        remarkName: body?.remark ?? '',
        projectName: name,
        projectSource: manualSegments.length ? 'manual' : 'timeline',
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
    url: `${API_PREFIX}/v1/video-projects`,
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
    url: `${API_PREFIX}/v1/video-projects/:id`,
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
    url: `${API_PREFIX}/v1/video-projects/:id`,
    method: 'put',
    response: ({
      body,
      query,
    }: {
      body: {
        live_id?: number;
        name?: string;
        remark?: string;
        clips0?: Array<{ start_time: number; end_time: number }>;
        clips1?: Array<{ start_time: number; end_time: number }>;
      };
      query: { id: string };
    }) => {
      const existing = getSliceProject(query.id);
      if (!existing) {
        return { code: 404, message: '剪辑项目不存在', data: null };
      }

      const hasClips0 = body?.clips0 !== undefined;
      const hasClips1 = body?.clips1 !== undefined;
      let segments = existing.segments;
      let projectSource = existing.projectSource;

      if (hasClips0 || hasClips1) {
        const timelineSegments = hasClips0
          ? clipsToSegments(body.clips0, 'timeline')
          : existing.segments.filter((item) => item.id.startsWith('timeline-'));
        const manualSegments = hasClips1
          ? clipsToSegments(body.clips1, 'manual')
          : existing.segments.filter((item) => !item.id.startsWith('timeline-'));
        segments = [...timelineSegments, ...manualSegments].sort((a, b) => a.start - b.start);
        if (!segments.length) {
          return { code: 400, message: '请先选择至少一个片段', data: null };
        }
        projectSource = manualSegments.length ? 'manual' : 'timeline';
      }

      const name = body?.name !== undefined ? body.name.trim() : existing.projectName;
      if (!name) {
        return { code: 400, message: '项目名称不能为空', data: null };
      }

      const project = saveSliceProjectRecord({
        id: query.id,
        sourceVideoId:
          body?.live_id != null ? String(body.live_id) : existing.sourceVideoId,
        remarkName: body?.remark !== undefined ? body.remark : existing.remarkName,
        projectName: name,
        projectSource,
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
    url: `${API_PREFIX}/v1/video-projects/:id/name`,
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
