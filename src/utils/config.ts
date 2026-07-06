export type NavLayout = 'top' | 'left';
export type LoginMode = 'page' | 'modal';

const env = import.meta.env;

const loginMode = (env.VITE_LOGIN_MODE as LoginMode) || 'modal';

export const appConfig = {
  title: env.VITE_APP_TITLE || 'Base UI',
  description: env.VITE_APP_DESCRIPTION || '基于 React + Vite + Ant Design 的前端项目模板',
  siteUrl: env.VITE_SITE_URL || 'http://localhost:8008',
  companyName: env.VITE_COMPANY_NAME || env.VITE_APP_TITLE || 'Base UI',
  gtmId: env.VITE_GTM_ID || '',
  apiProxyTarget: env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:3000',
  navLayout: (env.VITE_NAV_LAYOUT as NavLayout) || 'top',
  enableFloat: env.VITE_ENABLE_FLOAT !== 'false',
  enableGtm: env.VITE_ENABLE_GTM !== 'false' && !!env.VITE_GTM_ID,
  authSceneId: env.VITE_AUTH_SCENE_ID || 'default',
  apiPrefix: env.VITE_API_PREFIX || '/openapi',
  contactQrcodeUrl: env.VITE_CONTACT_QRCODE_URL || '',
  supportTitle: env.VITE_SUPPORT_TITLE || `${env.VITE_APP_TITLE || 'Base UI'} 技术支持`,
  loginMode,
} as const;

export const isLoginPageMode = loginMode === 'page';
export const isLoginModalMode = loginMode === 'modal';
export const isLeftNavLayout = appConfig.navLayout === 'left';
export const isTopNavLayout = appConfig.navLayout === 'top';
