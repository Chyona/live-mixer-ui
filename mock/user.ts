import { MockMethod } from 'vite-plugin-mock';
import { API_PREFIX } from './_config';

export default [
  {
    url: `${API_PREFIX}/v1/user`,
    method: 'get',
    response: () => ({
      code: 0,
      message: '',
      data: { id: '222', name: 'userName', token: 'mock-token' },
    }),
  },
  {
    url: `${API_PREFIX}/v1/auth/login`,
    method: 'post',
    response: ({ body }: { body: { username?: string; password?: string } }) => {
      if (body?.username && body?.password) {
        return {
          code: 0,
          message: '',
          data: { id: '222', username: body.username, token: 'mock-token' },
        };
      }
      return {
        code: 400,
        message: '用户名或密码错误',
        data: null,
      };
    },
  },
] as MockMethod[];
