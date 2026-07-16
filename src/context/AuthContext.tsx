import { createContext, useContext, useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation, type Location } from 'react-router-dom';
import PageLoading from '~/components/PageLoading';
import { UserLoginResult } from '~/services/login';
import { getUserInfo } from '~/services/user';
import { closeLogin, completeLoginRedirect, openLogin } from '~/utils/loginFlow';
import { isLoginModalMode } from '~/utils/config';

/** @deprecated 请优先使用 AuthContext；保留供 useLoginChange 监听 */
export const LOGIN_CHANGE_EVENT = 'loginStateChange';

/** 非 React 层（如 http 拦截器）清会话后通知 AuthProvider 重置 userInfo */
export function emitAuthLogoutEvent() {
  window.dispatchEvent(new CustomEvent(LOGIN_CHANGE_EVENT, { detail: { state: 'logout' } }));
}

interface AuthContextType {
  loading: boolean;
  userInfo: Partial<UserLoginResult>;
  updateAuthInfo: (tokenData: UserLoginResult) => void;
  fetchUserInfo: (id: string) => Promise<void>;
  logout: () => void;
}

export const AUTH_TOKEN_KEY = 'auth_token';

const AuthContext = createContext<AuthContextType>(null!);

const AuthLoading = () => <PageLoading viewport />;

function ModalLoginGate({ from }: { from: Location }) {
  useEffect(() => {
    openLogin(from);
  }, [from]);

  return <AuthLoading />;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [userInfo, setUserInfo] = useState<Partial<UserLoginResult>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (token) {
      try {
        setUserInfo(JSON.parse(token));
      } catch {
        localStorage.removeItem(AUTH_TOKEN_KEY);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const handleLoginChange = (event: Event) => {
      const detail = (event as CustomEvent<Partial<UserLoginResult> & { state?: string }>).detail;
      if (detail?.state === 'logout') {
        setUserInfo({});
        return;
      }
      if (detail?.state === 'login') {
        setUserInfo(detail);
      }
    };

    window.addEventListener(LOGIN_CHANGE_EVENT, handleLoginChange as EventListener);
    return () => {
      window.removeEventListener(LOGIN_CHANGE_EVENT, handleLoginChange as EventListener);
    };
  }, []);

  const updateAuthInfo = (tokenData: Partial<UserLoginResult>) => {
    let oldData = {};
    try {
      const val = localStorage.getItem(AUTH_TOKEN_KEY);
      oldData = val ? JSON.parse(val) : {};
    } catch (error) {
      console.error('auth_token JSON old 失败:', error);
    }
    try {
      const newData = {
        ...oldData,
        ...tokenData,
      };
      localStorage.setItem(AUTH_TOKEN_KEY, JSON.stringify(newData));
      setUserInfo(newData);
      closeLogin();
      window.dispatchEvent(
        new CustomEvent(LOGIN_CHANGE_EVENT, { detail: { ...newData, state: 'login' } })
      );
      completeLoginRedirect();
    } catch (error) {
      console.error('auth_token JSON 失败:', error);
    }
  };

  const fetchUserInfo = async (id: string) => {
    const { code, data } = await getUserInfo(id);
    if (code === 0 && data) {
      updateAuthInfo(data);
    }
  };

  const logout = () => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    setUserInfo({});
    emitAuthLogoutEvent();
    openLogin();
  };

  const value: AuthContextType = {
    loading,
    userInfo,
    logout,
    updateAuthInfo,
    fetchUserInfo,
  };

  if (loading) {
    return (
      <AuthContext.Provider value={value}>
        <PageLoading viewport />
      </AuthContext.Provider>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function ProtectedRoute() {
  const location = useLocation();
  const { userInfo, loading } = useAuth();

  if (loading) return <AuthLoading />;

  if (userInfo?.id) return <Outlet />;

  if (isLoginModalMode) {
    return <ModalLoginGate from={location} />;
  }

  return <Navigate to="/login" state={{ from: location }} replace />;
}

export function useAuth() {
  return useContext(AuthContext);
}
