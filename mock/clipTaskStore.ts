export type StoredClipTask = {
  taskId: string;
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

export function createClipTask(input: {
  taskId: string;
  sourceVideoId: string;
  sourceVideoName: string;
  m3u8Url: string;
}) {
  clipTaskStore.unshift({
    taskId: input.taskId,
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

export function toPublicClipTask(task: StoredClipTask) {
  return {
    taskId: task.taskId,
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
