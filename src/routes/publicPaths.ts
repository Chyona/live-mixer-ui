import { RoutesCfg } from './const';

/** 系统路由公开白名单（不在 RoutesCfg 中注册的业务页） */
export const SYSTEM_PUBLIC_PATHS = ['/login', '/error'] as const;

/** 路由配置中标记 public: true 的业务页 + 系统公开路径 */
export function getPublicPathWhitelist(): string[] {
  const fromRoutes = RoutesCfg.filter((route) => route.public).map((route) => route.path);
  return [...new Set([...SYSTEM_PUBLIC_PATHS, ...fromRoutes])];
}

/** 当前 pathname 是否在公开白名单内（精确匹配） */
export function isPublicPath(pathname: string): boolean {
  return getPublicPathWhitelist().includes(pathname);
}
