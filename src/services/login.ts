import { appConfig } from '~/utils/config';
import { type BaseResponse, request } from './http';

export type UserLoginParams = { phone: string; pass: string };

interface UserCheckResult {
  exists: boolean;
}

export enum UserRole {
  Normal = 'normal',
  Admin = 'admin',
}

export interface UserLoginResult {
  id: string;
  name: string;
  role?: UserRole;
  token?: string;
  user_type?: number;
  points?: number;
  apiKey?: string;
  vipLevel?: number;
  vipExpireAt?: number;
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
  return await request('/v1/user/auth/login', {
    method: 'post',
    data: params,
  });
}

export async function getPhoneCode(phone: string) {
  return await request('/v1/user/auth/sms', {
    method: 'post',
    data: { phone },
  });
}

export async function fetchQRCode(): Promise<BaseResponse<QRcodeResult>> {
  return await request('/v1/user/auth/qrcode', {
    method: 'get',
    params: { sceneID: appConfig.authSceneId },
  });
}

export async function fetchQRCodeLogin(ticket: string): Promise<BaseResponse<UserLoginResult>> {
  return await request('/v1/user/auth/qrcode/status', {
    method: 'get',
    params: { ticket, sceneID: appConfig.authSceneId },
  });
}
