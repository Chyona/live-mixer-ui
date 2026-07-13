import { AUTH_TOKEN_KEY, LOGIN_CHANGE_EVENT } from '~/context/AuthContext';
import { openLogin } from '~/utils/loginFlow';

const redirectToLogin = (() => {
  let redirectId: ReturnType<typeof setTimeout> | null = null;

  function redirect() {
    if (redirectId) {
      clearTimeout(redirectId);
    }

    redirectId = setTimeout(() => {
      clearAuthSession();
      openLogin();
      redirectId = null;
    }, 1000);
  }

  return redirect;
})();

export function clearAuthSession() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  window.dispatchEvent(
    new CustomEvent(LOGIN_CHANGE_EVENT, { detail: { state: 'logout' } })
  );
}

export function requireLoginRedirect() {
  redirectToLogin();
}
