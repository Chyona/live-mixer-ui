import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import type { NavigateFunction } from 'react-router-dom';
import { AUTH_TOKEN_KEY } from '~/context/AuthContext';
import { handleSessionExpired } from '~/services/authSession';
import { isSessionExpiredCode } from '~/services/businessCodes';
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

/** 会话失效（HTTP 401 或业务码 401 / 12010），调用方不应再弹业务错误提示 */
export function isUnauthorizedError(error: unknown): boolean {
  return error instanceof AppError && isSessionExpiredCode(error.errorCode);
}

const AUTH_LOGIN_PATH = '/v1/auth/login';

function isAuthLoginRequestUrl(url: string): boolean {
  return url.includes(AUTH_LOGIN_PATH);
}

function isAuthLoginRequest(error: AxiosError): boolean {
  return isAuthLoginRequestUrl(String(error.config?.url ?? ''));
}

function getErrorPayload(error: AxiosError): Record<string, unknown> | null {
  const data = error.response?.data;
  if (!data || typeof data !== 'object') return null;
  return data as Record<string, unknown>;
}

function readBusinessCode(payload: unknown): unknown {
  if (!payload || typeof payload !== 'object') return undefined;
  const data = payload as Record<string, unknown>;
  return data.code ?? data.errorCode;
}

function readBusinessMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== 'object') return fallback;
  const data = payload as Record<string, unknown>;
  const message =
    (typeof data.message === 'string' && data.message.trim()) ||
    (typeof data.errorMessage === 'string' && data.errorMessage.trim()) ||
    '';
  return message || fallback;
}

/** 从接口错误体中提取可读文案，兼容 code/message 与 errorCode/errorMessage */
function resolveHttpErrorMessage(
  error: AxiosError,
  fallback: string
): { message: string; code: number } {
  const payload = getErrorPayload(error);
  if (!payload) {
    return { message: fallback, code: error.response?.status ?? 500 };
  }

  const messageCandidate = readBusinessMessage(payload, '');
  const rawCode = readBusinessCode(payload);
  const codeCandidate =
    rawCode != null && Number.isFinite(Number(rawCode))
      ? Number(rawCode)
      : (error.response?.status ?? 500);

  if (messageCandidate) {
    return { message: messageCandidate, code: codeCandidate };
  }

  return { message: fallback, code: codeCandidate };
}

function rejectSessionExpired(
  message: string,
  navigate?: NavigateFunction,
  axiosError?: AxiosError
): Promise<never> {
  const { pathname, search, hash } = window.location;
  handleSessionExpired({ pathname, search, hash }, navigate, { message });
  return Promise.reject(new AppError(message, HTTP_STATUS_UNAUTHORIZED, axiosError));
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
    (response) => {
      // HTTP 200 + 业务码 401/12010：后端常见写法，需在成功回调里拦截
      const payload = response.data;
      const requestUrl = String(response.config?.url ?? '');
      if (
        !isAuthLoginRequestUrl(requestUrl) &&
        isSessionExpiredCode(readBusinessCode(payload))
      ) {
        const message = readBusinessMessage(payload, '未登录或登录已过期');
        return rejectSessionExpired(message, navigate);
      }
      return response;
    },
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

          const resolved = resolveHttpErrorMessage(error, '未登录或登录已过期');
          return rejectSessionExpired(resolved.message, navigate, error);
        }

        // 其他 HTTP 错误：若业务体仍带会话失效码，同样走登录
        if (
          !isAuthLoginRequest(error) &&
          isSessionExpiredCode(readBusinessCode(error.response.data))
        ) {
          const resolved = resolveHttpErrorMessage(error, '未登录或登录已过期');
          return rejectSessionExpired(resolved.message, navigate, error);
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
  // 兜底：拦截器未就绪时仍处理业务会话失效码
  if (isSessionExpiredCode(response?.code)) {
    const message = readBusinessMessage(response, '未登录或登录已过期');
    handleSessionExpired(undefined, undefined, { message });
    throw new AppError(message, HTTP_STATUS_UNAUTHORIZED);
  }

  handleBusinessResponse(response);

  return data;
}
