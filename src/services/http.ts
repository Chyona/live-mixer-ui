import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import type { NavigateFunction } from 'react-router-dom';
import { AUTH_TOKEN_KEY } from '~/context/AuthContext';
import { handleSessionExpired } from '~/services/authSession';
import { BusinessCode } from '~/services/businessCodes';
import { handleBusinessResponse } from '~/services/responseHandlers';
import type { BaseResponse } from '~/services/types';
import { apiPath } from '~/utils/api';

export type { BaseResponse } from '~/services/types';

export const HTTP_STATUS_UNAUTHORIZED = 401;
export const HTTP_STATUS_TIMEOUT = 408;

/** 接口默认超时（毫秒）；单次请求可在 options.timeout 覆盖 */
export const DEFAULT_REQUEST_TIMEOUT_MS = 30_000;

axios.defaults.timeout = DEFAULT_REQUEST_TIMEOUT_MS;

function isTimeoutError(error: AxiosError): boolean {
  return (
    error.code === 'ECONNABORTED' ||
    error.code === 'ETIMEDOUT' ||
    /timeout/i.test(error.message ?? '')
  );
}

export class AppError extends Error {
  errorMessage: string;
  errorCode: number;
  resp?: AxiosError;

  constructor(message: string, code: number, resp?: AxiosError) {
    super(message);
    this.errorCode = code;
    this.errorMessage = message;
    this.name = 'AppError';
    this.resp = resp;
  }
}

/** 会话失效（HTTP 401 或业务码 12010），调用方不应再弹业务错误提示 */
export function isUnauthorizedError(error: unknown): boolean {
  return (
    error instanceof AppError &&
    (error.errorCode === HTTP_STATUS_UNAUTHORIZED ||
      error.errorCode === BusinessCode.SESSION_EXPIRED)
  );
}

const AUTH_LOGIN_PATH = '/v1/auth/login';

function isAuthLoginRequest(error: AxiosError): boolean {
  const requestUrl = String(error.config?.url ?? '');
  return requestUrl.includes(AUTH_LOGIN_PATH);
}

function getErrorPayload(error: AxiosError): Record<string, unknown> | null {
  const data = error.response?.data;
  if (!data || typeof data !== 'object') return null;
  return data as Record<string, unknown>;
}

/** 从接口错误体中提取可读文案，兼容 code/message 与 errorCode/errorMessage */
function resolveHttpErrorMessage(error: AxiosError, fallback: string): { message: string; code: number } {
  const payload = getErrorPayload(error);
  if (!payload) {
    return { message: fallback, code: error.response?.status ?? 500 };
  }

  const messageCandidate =
    (typeof payload.message === 'string' && payload.message.trim()) ||
    (typeof payload.errorMessage === 'string' && payload.errorMessage.trim()) ||
    '';

  const codeCandidate =
    typeof payload.code === 'number'
      ? payload.code
      : typeof payload.errorCode === 'number'
        ? payload.errorCode
        : error.response?.status ?? 500;

  if (messageCandidate) {
    return { message: messageCandidate, code: codeCandidate };
  }

  if (typeof payload.errorCode === 'number' && typeof payload.errorMessage === 'string') {
    return {
      message: `${payload.errorMessage}(${payload.errorCode})`,
      code: payload.errorCode,
    };
  }

  return { message: fallback, code: codeCandidate };
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
    (error): Promise<AppError> => {
      let message: string;
      let code: number;

      if (error.response) {
        // 登录接口的 401 表示账号密码错误等认证失败，不应走「会话过期」清 session / 弹登录
        if (error.response.status === HTTP_STATUS_UNAUTHORIZED) {
          if (isAuthLoginRequest(error)) {
            const resolved = resolveHttpErrorMessage(error, '用户名或密码错误');
            return Promise.reject(new AppError(resolved.message, resolved.code, error));
          }

          const { pathname, search, hash } = window.location;
          handleSessionExpired({ pathname, search, hash }, navigate);
          return Promise.reject(
            new AppError('未登录或登录已过期', HTTP_STATUS_UNAUTHORIZED, error)
          );
        }

        const resolved = resolveHttpErrorMessage(error, '请求响应错误！');
        message = resolved.message;
        code = resolved.code;
      } else if (isTimeoutError(error)) {
        message = '请求超时，请稍后重试';
        code = HTTP_STATUS_TIMEOUT;
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
  const { data } = await axios.request<T>({
    url: apiPath(url),
    timeout: DEFAULT_REQUEST_TIMEOUT_MS,
    ...options,
  });

  const response = data as BaseResponse;
  // 业务码会话过期：立即清会话并 reject，避免调用方再按 code!==0 弹提示
  if (response?.code === BusinessCode.SESSION_EXPIRED) {
    handleSessionExpired();
    const message =
      (typeof response.message === 'string' && response.message.trim()) || '未登录或登录已过期';
    throw new AppError(message, BusinessCode.SESSION_EXPIRED);
  }

  handleBusinessResponse(response);

  return data;
}
