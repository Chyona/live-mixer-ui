import type { SelectedCopySegment } from '../src/pages/ManualVideoSlice/types';
import type { SliceProjectSource } from '../src/services/sliceProject';

export type SliceProjectRecord = {
  id: string;
  sourceVideoId: string;
  sourceVideoName: string;
  remarkName: string;
  projectName: string;
  projectSource: SliceProjectSource;
  segmentCount: number;
  updatedAt: string;
  segments: SelectedCopySegment[];
};

/** key: sourceVideoId */
const sliceProjectMap = new Map<string, SliceProjectRecord>();

function buildProjectId(sourceVideoId: string) {
  return `vp-${sourceVideoId}`;
}

function seedSliceProjects() {
  if (sliceProjectMap.size > 0) return;

  const seeds: Omit<SliceProjectRecord, 'id' | 'segments'>[] = [
    {
      sourceVideoId: '1',
      sourceVideoName: '周末游戏直播回放',
      remarkName: '游戏专场素材',
      projectName: '周末游戏直播回放 剪辑项目',
      projectSource: 'timeline',
      segmentCount: 12,
      updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    },
    {
      sourceVideoId: '2',
      sourceVideoName: '新品发布会直播',
      remarkName: '发布会实录',
      projectName: '新品发布会直播 剪辑项目',
      projectSource: 'manual',
      segmentCount: 1,
      updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(),
    },
    {
      sourceVideoId: '5',
      sourceVideoName: '数码产品测评',
      remarkName: '测评专场',
      projectName: '数码产品测评 剪辑项目',
      projectSource: 'manual',
      segmentCount: 5,
      updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    },
  ];

  for (const item of seeds) {
    sliceProjectMap.set(item.sourceVideoId, {
      id: buildProjectId(item.sourceVideoId),
      segments:
        item.projectSource === 'manual' && item.sourceVideoId === '2'
          ? [
              {
                id: 'seed-segment-1',
                speakerId: 'speaker-1',
                speakerName: '主播',
                text: 'seed segment',
                start: 0,
                end: 30,
              },
            ]
          : item.projectSource === 'timeline' && item.sourceVideoId === '1'
            ? [
                {
                  id: 'seed-timeline-1',
                  speakerId: 'speaker-1',
                  speakerName: '主播',
                  text: 'timeline segment',
                  start: 10,
                  end: 40,
                },
              ]
            : [],
      ...item,
    });
  }
}

seedSliceProjects();

export function upsertSliceProject(input: {
  sourceVideoId: string;
  sourceVideoName?: string;
  remarkName?: string;
  projectName: string;
  projectSource?: SliceProjectSource;
  segmentCount: number;
  segments?: SelectedCopySegment[];
  projectId?: string;
}) {
  const existing = sliceProjectMap.get(input.sourceVideoId);
  const next: SliceProjectRecord = {
    id: input.projectId || existing?.id || buildProjectId(input.sourceVideoId),
    sourceVideoId: input.sourceVideoId,
    sourceVideoName: input.sourceVideoName ?? existing?.sourceVideoName ?? '未命名源视频',
    remarkName: input.remarkName ?? existing?.remarkName ?? '',
    projectName: input.projectName,
    projectSource: input.projectSource ?? existing?.projectSource ?? 'manual',
    segmentCount: input.segmentCount,
    updatedAt: new Date().toISOString(),
    segments: input.segments ?? existing?.segments ?? [],
  };

  sliceProjectMap.set(input.sourceVideoId, next);
  return next;
}

export function saveSliceProjectRecord(input: {
  /** 路径上的 id：优先按项目 id 匹配，否则按源视频 id */
  id: string;
  sourceVideoId?: string;
  sourceVideoName?: string;
  remarkName?: string;
  projectName?: string;
  projectSource?: SliceProjectSource;
  segments: SelectedCopySegment[];
}) {
  const existing = getSliceProject(input.id);
  const sourceVideoId = input.sourceVideoId || existing?.sourceVideoId || input.id;
  const projectName =
    input.projectName?.trim() ||
    existing?.projectName ||
    `${input.sourceVideoName ?? existing?.sourceVideoName ?? '未命名源视频'} 剪辑项目`;

  return upsertSliceProject({
    sourceVideoId,
    projectId: existing?.id,
    sourceVideoName: input.sourceVideoName ?? existing?.sourceVideoName,
    remarkName: input.remarkName ?? existing?.remarkName,
    projectName,
    projectSource: input.projectSource ?? existing?.projectSource ?? 'manual',
    segmentCount: input.segments.length,
    segments: input.segments,
  });
}

/** 支持按项目 id 或源视频 id 查找 */
export function getSliceProject(projectIdOrSourceVideoId: string) {
  const bySource = sliceProjectMap.get(projectIdOrSourceVideoId);
  if (bySource) return bySource;
  return (
    Array.from(sliceProjectMap.values()).find((item) => item.id === projectIdOrSourceVideoId) ??
    null
  );
}

export function listSliceProjects() {
  return Array.from(sliceProjectMap.values()).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export function updateSliceProjectName(projectIdOrSourceVideoId: string, projectName: string) {
  const project = getSliceProject(projectIdOrSourceVideoId);
  if (!project) return null;

  project.projectName = projectName;
  project.updatedAt = new Date().toISOString();
  return project;
}

export function toPublicSliceProject(
  project: SliceProjectRecord,
  options?: { withSegments?: boolean }
) {
  const { segments, ...rest } = project;
  return {
    ...rest,
    ...(options?.withSegments ? { segments } : {}),
  };
}
