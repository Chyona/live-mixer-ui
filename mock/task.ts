import type { MockMethod } from 'vite-plugin-mock';
import { API_PREFIX } from './_config';
import { clipTaskStore, toPublicClipTask } from './clipTaskStore';

export default [
  {
    url: `${API_PREFIX}/v1/clip-tasks`,
    method: 'get',
    response: () => ({
      code: 0,
      message: '',
      data: {
        list: clipTaskStore.map(toPublicClipTask),
        total: clipTaskStore.length,
      },
    }),
  },
] as MockMethod[];
