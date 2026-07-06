import { lazy, type ComponentType } from 'react';
import type { IconType } from 'react-icons';
import { FaHome } from 'react-icons/fa';

export interface RouteCfgType {
  path: string;
  text: string;
  icon: IconType;
  element: ComponentType | null;  /** 加入公开白名单，未登录可访问；未标记则默认需登录 */
  public?: boolean;
  href?: string;
  active?: boolean;
  hideInMenu?: boolean;
  iconProps?: React.ComponentProps<IconType>;
  badgeProps?: {
    text: string;
    color?: string;
  };
  links?: {
    text: string;
    icon: IconType;
    href: string;
  }[];
}

/** 已注册页面路由（含 element，非外链） */
export type AppRouteCfg = RouteCfgType & { element: ComponentType };

export function isAppRoute(route: RouteCfgType): route is AppRouteCfg {
  return route.element != null && !route.href;
}

export const LoginRoute = lazy(() => import('~/pages/Login'));
export const HomePage = lazy(() => import('~/pages/Home'));
export const ErrorPage = lazy(() => import('~/pages/Error'));

/** 导航菜单 & 受保护路由配置，新增页面在此追加 */
export const RoutesCfg: RouteCfgType[] = [
  {
    path: '/',
    text: '首页',
    icon: FaHome,
    element: HomePage,
    public: true,
  },
];
