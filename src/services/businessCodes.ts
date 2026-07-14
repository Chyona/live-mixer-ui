/** 业务状态码，按后端约定在此扩展。code === 0 成功，其余均为异常。 */
export const BusinessCode = {
  SUCCESS: 0,
  SESSION_EXPIRED: 12010,
} as const;

export type BusinessCodeValue = (typeof BusinessCode)[keyof typeof BusinessCode];

export function isBusinessSuccess(code: number): boolean {
  return code === BusinessCode.SUCCESS;
}
