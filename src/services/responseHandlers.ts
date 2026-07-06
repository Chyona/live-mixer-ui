import { BusinessCode } from './businessCodes';
import { requireLoginRedirect } from './authSession';
import type { BaseResponse } from './types';

/** 处理业务层返回码，与 HTTP 传输层解耦 */
export function handleBusinessResponse(response: BaseResponse): void {
  switch (response.code) {
    case BusinessCode.SESSION_EXPIRED:
      requireLoginRedirect();
      break;
    default:
      break;
  }
}
