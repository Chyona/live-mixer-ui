import type { SelectedCopySegment } from '~/pages/ManualVideoSlice/types';
import { upsertSliceProject } from './sliceProjectStore';

export type GenerationTaskType = 'clip_generate' | 'ai_slice_select';

export type StoredClipTask = {
  taskId: string;
  taskType: GenerationTaskType;
  clipName: string;
  sourceVideoId: string;
  sourceVideoName: string;
  m3u8Url: string;
  status: 'pending' | 'processing' | 'running' | 'success' | 'failed';
  progress: number;
  videoUrls: string[];
  draftUrls: string[];
  message: string | null;
  createdAt: string;
  pollCount: number;
  promptName?: string | null;
  aiClips?: Array<{ start: number; end: number }>;
  aiSegments?: SelectedCopySegment[];
  segmentCount?: number;
};

const MOCK_VIDEO_URL =
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

export const clipTaskStore: StoredClipTask[] = [];

function seedMockClipTasks() {
  if (clipTaskStore.length > 0) return;

  const now = Date.now();

  clipTaskStore.push(
    {
      taskId: 'clip-task-seed-001',
      taskType: 'clip_generate',
      clipName: '周末游戏直播回放 精彩片段',
      sourceVideoId: 'sv-001',
      sourceVideoName: '周末游戏直播回放',
      m3u8Url: MOCK_VIDEO_URL,
      status: 'success',
      progress: 100,
      videoUrls: [MOCK_VIDEO_URL],
      draftUrls: ['https://mock.example.com/drafts/clip-task-seed-001.json'],
      message: null,
      createdAt: new Date(now - 1000 * 60 * 60 * 26).toISOString(),
      pollCount: 5,
    },
    {
      taskId: 'clip-task-seed-002',
      taskType: 'clip_generate',
      clipName: '新品发布会直播 高光合集',
      sourceVideoId: 'sv-002',
      sourceVideoName: '新品发布会直播',
      m3u8Url: 'https://example.com/live/product_launch.m3u8',
      status: 'running',
      progress: 45,
      videoUrls: [],
      draftUrls: [],
      message: null,
      createdAt: new Date(now - 1000 * 60 * 12).toISOString(),
      pollCount: 1,
    },
    {
      taskId: 'clip-task-seed-003',
      taskType: 'clip_generate',
      clipName: '户外探店直播 成片',
      sourceVideoId: 'sv-003',
      sourceVideoName: '户外探店直播',
      m3u8Url: 'https://example.com/videos/explore_shop.mp4',
      status: 'failed',
      progress: 42,
      videoUrls: [],
      draftUrls: [],
      message: '视频流解析失败：源地址无法访问或已过期',
      createdAt: new Date(now - 1000 * 60 * 60 * 5).toISOString(),
      pollCount: 2,
    },
    {
      taskId: 'ai-slice-task-seed-001',
      taskType: 'ai_slice_select',
      clipName: '周末游戏直播回放 AI选片',
      sourceVideoId: 'sv-001',
      sourceVideoName: '周末游戏直播回放',
      m3u8Url: '',
      status: 'success',
      progress: 100,
      videoUrls: [],
      draftUrls: [],
      message: null,
      createdAt: new Date(now - 1000 * 60 * 60 * 8).toISOString(),
      pollCount: 4,
      promptName: '高光片段筛选',
      segmentCount: 6,
      aiSegments: [
        {
          id: 'ai-seg-1',
          speakerId: 'host',
          speakerName: '主播',
          text: '今天给大家带来的是春季上新系列，性价比非常高。',
          start: 4,
          end: 9,
        },
        {
          id: 'ai-seg-2',
          speakerId: 'guest',
          speakerName: '嘉宾',
          text: '很多老用户反馈上身效果比上一代更舒适。',
          start: 13.5,
          end: 18,
        },
      ],
    },
    {
      taskId: 'ai-slice-task-seed-002',
      taskType: 'ai_slice_select',
      clipName: '新品发布会直播 AI选片',
      sourceVideoId: 'sv-002',
      sourceVideoName: '新品发布会直播',
      m3u8Url: '',
      status: 'running',
      progress: 55,
      videoUrls: [],
      draftUrls: [],
      message: null,
      createdAt: new Date(now - 1000 * 60 * 20).toISOString(),
      pollCount: 2,
      promptName: '产品卖点提取',
      aiClips: [{ start: 60, end: 180 }],
    }
  );
}

seedMockClipTasks();

export function createClipTask(input: {
  taskId: string;
  sourceVideoId: string;
  sourceVideoName: string;
  m3u8Url: string;
}) {
  clipTaskStore.unshift({
    taskId: input.taskId,
    taskType: 'clip_generate',
    clipName: `${input.sourceVideoName} 成片`,
    sourceVideoId: input.sourceVideoId,
    sourceVideoName: input.sourceVideoName,
    m3u8Url: input.m3u8Url,
    status: 'pending',
    progress: 0,
    videoUrls: [],
    draftUrls: [],
    message: null,
    createdAt: new Date().toISOString(),
    pollCount: 0,
  });
}

export function createAiSliceTask(input: {
  taskId: string;
  sourceVideoId: string;
  sourceVideoName: string;
  promptName: string;
  clips: Array<{ start: number; end: number }>;
  segments?: SelectedCopySegment[];
}) {
  clipTaskStore.unshift({
    taskId: input.taskId,
    taskType: 'ai_slice_select',
    clipName: `${input.sourceVideoName} AI选片`,
    sourceVideoId: input.sourceVideoId,
    sourceVideoName: input.sourceVideoName,
    m3u8Url: '',
    status: 'pending',
    progress: 0,
    videoUrls: [],
    draftUrls: [],
    message: null,
    createdAt: new Date().toISOString(),
    pollCount: 0,
    promptName: input.promptName,
    aiClips: input.clips,
    aiSegments: input.segments,
    segmentCount: input.segments?.length ?? 0,
  });
}

function advanceAiSliceTask(task: StoredClipTask) {
  task.pollCount += 1;

  if (task.pollCount <= 1) {
    task.status = 'processing';
    task.progress = 20;
    return;
  }

  if (task.pollCount <= 2) {
    task.status = 'running';
    task.progress = 55;
    return;
  }

  if (task.pollCount <= 3) {
    task.status = 'running';
    task.progress = 85;
    return;
  }

  if (!task.aiSegments?.length) {
    task.status = 'failed';
    task.message = '所选时间范围内未匹配到文案片段';
    task.progress = task.progress || 85;
    return;
  }

  task.status = 'success';
  task.progress = 100;
  task.segmentCount = task.aiSegments.length;
  task.message = null;

  upsertSliceProject({
    sourceVideoId: task.sourceVideoId,
    sourceVideoName: task.sourceVideoName,
    projectName: `${task.sourceVideoName} 剪辑项目`,
    segmentCount: task.segmentCount,
  });
}

export function getClipTaskPollResult(taskId: string) {
  const task = clipTaskStore.find((item) => item.taskId === taskId);
  if (!task) return null;

  if (task.status === 'failed' || task.status === 'success') {
    return {
      task_id: task.taskId,
      status: task.status,
      progress: task.progress,
      video_urls: task.videoUrls,
      draft_urls: task.draftUrls,
      error: task.message,
    };
  }

  if (task.taskType === 'ai_slice_select') {
    advanceAiSliceTask(task);
    return {
      task_id: task.taskId,
      status: task.status,
      progress: task.progress,
      video_urls: task.videoUrls,
      draft_urls: task.draftUrls,
      error: task.message,
    };
  }

  task.pollCount += 1;

  if (task.pollCount <= 2) {
    task.status = 'processing';
    task.progress = task.pollCount * 25;
  } else if (task.pollCount <= 4) {
    task.status = 'running';
    task.progress = 50 + task.pollCount * 10;
  } else {
    task.status = 'success';
    task.progress = 100;
    task.videoUrls = [MOCK_VIDEO_URL];
    task.draftUrls = [`https://mock.example.com/drafts/${task.taskId}.json`];
    task.message = null;
  }

  return {
    task_id: task.taskId,
    status: task.status,
    progress: task.progress,
    video_urls: task.videoUrls,
    draft_urls: task.draftUrls,
    error: task.message,
  };
}

export function markClipTaskFailed(taskId: string, message: string) {
  const task = clipTaskStore.find((item) => item.taskId === taskId);
  if (!task) return;
  task.status = 'failed';
  task.message = message;
}

export function updateClipTaskName(taskId: string, clipName: string) {
  const task = clipTaskStore.find((item) => item.taskId === taskId);
  if (!task) return null;
  task.clipName = clipName;
  return task;
}

export function deleteClipTask(taskId: string) {
  const index = clipTaskStore.findIndex((item) => item.taskId === taskId);
  if (index < 0) return false;
  clipTaskStore.splice(index, 1);
  return true;
}

export function toPublicClipTask(task: StoredClipTask) {
  return {
    taskId: task.taskId,
    taskType: task.taskType,
    clipName: task.clipName,
    sourceVideoId: task.sourceVideoId,
    sourceVideoName: task.sourceVideoName,
    m3u8Url: task.m3u8Url,
    status: task.status,
    progress: task.progress,
    videoUrls: task.videoUrls,
    draftUrls: task.draftUrls,
    message: task.message,
    createdAt: task.createdAt,
    promptName: task.promptName ?? null,
    segmentCount: task.segmentCount ?? task.aiSegments?.length ?? 0,
    aiSegments: task.aiSegments ?? [],
  };
}
