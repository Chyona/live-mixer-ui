import type { Location } from 'react-router-dom';

import { getLoginModalStore } from '~/components/LoginModal/store';
import { isLoginModalMode, isLoginPageMode } from '~/utils/config';
import { navigateTo } from '~/utils/navigation';

type LoginFrom = Pick<Location, 'pathname' | 'search' | 'hash'>;

function buildReturnPath(from?: LoginFrom) {
  const pathname = from?.pathname ?? window.location.pathname;
  const search = from?.search ?? window.location.search;
  const hash = from?.hash ?? window.location.hash;
  return `${pathname}${search}${hash}`;
}

export { buildReturnPath };
export type { LoginFrom };
/** 按 VITE_LOGIN_MODE 打开登录页或登录弹窗 */
export function openLogin(from?: LoginFrom) {
  if (isLoginModalMode) {
    const returnTo = buildReturnPath(from);
    const store = getLoginModalStore();
    store.returnTo = returnTo === '/login' ? '/' : returnTo;
    store.open = true;
    return;
  }

  const pathname = from?.pathname ?? window.location.pathname;
  if (pathname === '/login') {
    getLoginModalStore().open = true;
    return;
  }

  navigateTo('/login', {
    from: {
      pathname,
      search: from?.search ?? '',
      hash: from?.hash ?? '',
    },
  });
}

export function closeLogin() {
  const store = getLoginModalStore();
  store.open = false;
  store.returnTo = null;
}

/** Modal 模式登录成功后跳回来源页 */
export function completeLoginRedirect() {
  if (!isLoginModalMode) return;

  const store = getLoginModalStore();
  const returnTo = store.returnTo || '/';
  store.open = false;
  store.returnTo = null;

  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (returnTo !== current) {
    navigateTo(returnTo);
  }
}

export { isLoginPageMode, isLoginModalMode };
