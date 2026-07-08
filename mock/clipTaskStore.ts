export type StoredClipTask = {
  taskId: string;
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
  };
}
