import type { MockMethod } from 'vite-plugin-mock';
import { API_PREFIX } from './_config';
import { createClipTask, getClipTaskPollResult } from './clipTaskStore';

export default [
  {
    url: `${API_PREFIX}/clipflow-ai/v2/video/process`,
    method: 'post',
    response: ({
      body,
    }: {
      body: {
        m3u8_url?: string;
        clips?: Array<{ start: number; end: number }>;
        prompt_id?: number;
        water_text?: string;
        count?: number;
        source_video_id?: string;
        source_video_name?: string;
      };
    }) => {
      if (!body?.m3u8_url?.trim() || !body.clips?.length) {
        return { code: 400, message: '请提供有效的 m3u8 地址和切片时间段', data: null };
      }

      const task_id = `clip-task-${Date.now()}`;
      createClipTask({
        taskId: task_id,
        sourceVideoId: body.source_video_id?.trim() || '',
        sourceVideoName: body.source_video_name?.trim() || '未命名源视频',
        m3u8Url: body.m3u8_url.trim(),
      });

      return {
        code: 0,
        message: '',
        data: { task_id },
      };
    },
  },
  {
    url: `${API_PREFIX}/clipflow-ai/v1/task`,
    method: 'get',
    response: ({ query }: { query: { task_id?: string } }) => {
      const taskId = typeof query.task_id === 'string' ? query.task_id : '';
      const result = getClipTaskPollResult(taskId);

      if (!result) {
        return { code: 404, message: '剪辑任务不存在', data: null };
      }

      return {
        code: 0,
        message: '',
        data: result,
      };
    },
  },
] as MockMethod[];
