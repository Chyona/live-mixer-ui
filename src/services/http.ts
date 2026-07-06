import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import type { NavigateFunction } from 'react-router-dom';
import { AUTH_TOKEN_KEY } from '~/context/AuthContext';
import { clearAuthSession } from '~/services/authSession';
import { openLogin } from '~/utils/loginFlow';
import { isLoginPageMode } from '~/utils/config';
import { handleBusinessResponse } from '~/services/responseHandlers';
import type { BaseResponse } from '~/services/types';
import { apiPath } from '~/utils/api';

export type { BaseResponse } from '~/services/types';

export class AppError extends Error {
  errorMessage: string;
  errorCode: number;
  resp: AxiosError;

  constructor(message: string, code: number, resp: AxiosError) {
    super(message);
    this.errorCode = code;
    this.errorMessage = message;
    this.name = 'AppError';
    this.resp = resp;
  }
}

axios.interceptors.request.use(
  (config) => {
    const tokenData = localStorage.getItem(AUTH_TOKEN_KEY);
    if (tokenData) {
      try {
        const parsedToken = JSON.parse(tokenData);
        if (parsedToken?.token) {
          config.headers.Authorization = `Bearer ${parsedToken.token}`;
        }
      } catch (error) {
        console.error('解析 token 数据失败:', error);
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export function setupHttpInterceptors(navigate: NavigateFunction) {
  const interceptorId = axios.interceptors.response.use(
    (response) => response,
    (error): Promise<AppError> | void => {
      let message: string;
      let code: number;

      if (error.response) {
        if (error.response.status === 401) {
          const { pathname, search, hash } = window.location;
          clearAuthSession();
          if (isLoginPageMode && pathname !== '/login') {
            navigate('/login', {
              replace: true,
              state: { from: { pathname, search, hash } },
            });
          } else {
            openLogin({ pathname, search, hash });
          }
          return;
        }

        try {
          const resp = error.response.data;
          message = resp.errorCode ? `${resp.errorMessage}(${resp.errorCode})` : '请求响应错误！';
          code = resp.errorCode ?? 500;
        } catch {
          message = '请求响应未知错误！';
          code = 500;
        }
      } else if (error.request) {
        message = '请求未收到响应！';
        code = 500;
      } else {
        message = '请求设置错误！';
        code = 500;
      }

      return Promise.reject(new AppError(message, code, error));
    }
  );

  return () => {
    axios.interceptors.response.eject(interceptorId);
  };
}

export async function request<T>(url: string, options: AxiosRequestConfig = {}): Promise<T> {
  const { data } = await axios.request<T>({ url: apiPath(url), ...options });

  handleBusinessResponse(data as BaseResponse);

  return data;
}
