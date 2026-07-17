import { appConfig } from '~/utils/config';
import { type BaseResponse, request } from './http';

export type UserLoginParams = { username: string; password: string };

interface UserCheckResult {
  exists: boolean;
}

export enum UserRole {
  Normal = 'normal',
  Admin = 'admin',
}

export interface UserLoginResult {
  id: string;
  username: string;
  role?: UserRole;
  token?: string;
}

export interface QRcodeResult {
  ticket: string;
}

export interface QRcodeLoginResult {
  user: UserLoginResult;
}

export async function checkUserName(phone: string): Promise<BaseResponse<UserCheckResult>> {
  return await request('/v1/user/check', {
    method: 'get',
    params: { phone },
  });
}

export async function pwdlogin(params: UserLoginParams): Promise<BaseResponse<UserLoginResult>> {
  return await request('/v1/auth/login', {
    method: 'post',
    data: params,
  });
}

/** 本地会话是否具备进入受保护路由的最低凭证（id + token） */
export function hasAuthCredentials(info: Partial<UserLoginResult> | null | undefined): boolean {
  return Boolean(info?.id && typeof info.token === 'string' && info.token.length > 0);
}

export async function getPhoneCode(phone: string) {
  return await request('/v1/auth/sms', {
    method: 'post',
    data: { phone },
  });
}

export async function fetchQRCode(): Promise<BaseResponse<QRcodeResult>> {
  return await request('/v1/auth/qrcode', {
    method: 'get',
    params: { sceneID: appConfig.authSceneId },
  });
}

export async function fetchQRCodeLogin(ticket: string): Promise<BaseResponse<UserLoginResult>> {
  return await request('/v1/auth/qrcode/status', {
    method: 'get',
    params: { ticket, sceneID: appConfig.authSceneId },
  });
}
