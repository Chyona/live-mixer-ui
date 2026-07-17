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

/**
 * 会话失效统一入口：立即清本地凭证并进入登录。
 * HTTP 401 与业务码 12010 共用，避免延迟清会话造成的竞态。
 */
export function handleSessionExpired(from?: LoginFrom, navigate?: NavigateFunction) {
  if (handlingSessionExpired) return;
  handlingSessionExpired = true;

  const location = from ?? currentFrom();
  clearAuthSession();

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
