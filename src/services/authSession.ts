import type { NavigateFunction } from 'react-router-dom';

import { AUTH_TOKEN_KEY, emitAuthLogoutEvent } from '~/context/AuthContext';
import { isLoginPageMode } from '~/utils/config';
import { openLogin, type LoginFrom } from '~/utils/loginFlow';
import { navigateTo } from '~/utils/navigation';

export function clearAuthSession() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  emitAuthLogoutEvent();
}

let handlingSessionExpired = false;

function currentFrom(): LoginFrom {
  return {
    pathname: window.location.pathname,
    search: window.location.search,
    hash: window.location.hash,
  };
}

function notifySessionExpired(message?: string) {
  const title = message?.trim() || '登录已过期';
  // 动态导入避免与 http ↔ toast 循环依赖；固定 key 防止并发请求叠多条
  void import('~/utils/toast').then(({ toast }) => {
    toast.notify.warning(title, undefined, { key: 'session-expired' });
  });
}

/**
 * 会话失效统一入口：提示、清本地凭证并进入登录。
 * HTTP 401 与业务码 12010/401 共用，避免延迟清会话造成的竞态与重复提示。
 */
export function handleSessionExpired(
  from?: LoginFrom,
  navigate?: NavigateFunction,
  options?: { message?: string }
) {
  if (handlingSessionExpired) return;
  handlingSessionExpired = true;

  const location = from ?? currentFrom();
  clearAuthSession();
  notifySessionExpired(options?.message);

  if (isLoginPageMode && location.pathname !== '/login') {
    if (navigate) {
      navigate('/login', {
        replace: true,
        state: { from: location },
      });
    } else {
      navigateTo('/login', { from: location });
    }
  } else {
    openLogin(location);
  }

  window.setTimeout(() => {
    handlingSessionExpired = false;
  }, 3000);
}
