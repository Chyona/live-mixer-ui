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

const sliceProjectMap = new Map<string, SliceProjectRecord>();

function seedSliceProjects() {
  if (sliceProjectMap.size > 0) return;

  const seeds: Omit<SliceProjectRecord, 'id' | 'segments'>[] = [
    {
      sourceVideoId: 'sv-001',
      sourceVideoName: '周末游戏直播回放',
      remarkName: '游戏专场素材',
      projectName: '周末游戏直播回放 剪辑项目',
      projectSource: 'timeline',
      segmentCount: 12,
      updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    },
    {
      sourceVideoId: 'sv-002',
      sourceVideoName: '新品发布会直播',
      remarkName: '发布会实录',
      projectName: '新品发布会直播 剪辑项目',
      projectSource: 'manual',
      segmentCount: 1,
      updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(),
    },
    {
      sourceVideoId: 'sv-005',
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
      id: item.sourceVideoId,
      segments: item.projectSource === 'manual' && item.sourceVideoId === 'sv-002'
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
        : item.projectSource === 'timeline' && item.sourceVideoId === 'sv-001'
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
}) {
  const existing = sliceProjectMap.get(input.sourceVideoId);
  const next: SliceProjectRecord = {
    id: input.sourceVideoId,
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
  sourceVideoId: string;
  sourceVideoName?: string;
  remarkName?: string;
  projectName?: string;
  projectSource?: SliceProjectSource;
  segments: SelectedCopySegment[];
}) {
  const existing = sliceProjectMap.get(input.sourceVideoId);
  const projectName =
    input.projectName?.trim() ||
    existing?.projectName ||
    `${input.sourceVideoName ?? existing?.sourceVideoName ?? '未命名源视频'} 剪辑项目`;

  return upsertSliceProject({
    sourceVideoId: input.sourceVideoId,
    sourceVideoName: input.sourceVideoName ?? existing?.sourceVideoName,
    remarkName: input.remarkName ?? existing?.remarkName,
    projectName,
    projectSource: input.projectSource ?? existing?.projectSource ?? 'manual',
    segmentCount: input.segments.length,
    segments: input.segments,
  });
}

export function getSliceProject(sourceVideoId: string) {
  return sliceProjectMap.get(sourceVideoId) ?? null;
}

export function listSliceProjects() {
  return Array.from(sliceProjectMap.values()).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export function updateSliceProjectName(sourceVideoId: string, projectName: string) {
  const project = sliceProjectMap.get(sourceVideoId);
  if (!project) return null;

  project.projectName = projectName;
  project.updatedAt = new Date().toISOString();
  return project;
}

export function toPublicSliceProject(project: SliceProjectRecord, options?: { withSegments?: boolean }) {
  const { segments, ...rest } = project;
  return {
    ...rest,
    ...(options?.withSegments ? { segments } : {}),
  };
}
