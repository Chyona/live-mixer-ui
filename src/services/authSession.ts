import { AUTH_TOKEN_KEY } from '~/context/AuthContext';
import { openLogin } from '~/utils/loginFlow';

const redirectToLogin = (() => {
  let redirectId: ReturnType<typeof setTimeout> | null = null;

  function redirect() {
    if (redirectId) {
      clearTimeout(redirectId);
    }

    redirectId = setTimeout(() => {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      openLogin();
      redirectId = null;
    }, 1000);
  }

  return redirect;
})();

export function clearAuthSession() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

export function requireLoginRedirect() {
  redirectToLogin();
}
