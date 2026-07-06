import { message } from 'antd';
import { useEffect, useCallback } from 'react';
import { useAuth } from '~/context/AuthContext';
import { getUserInfo } from '~/services/user';

interface Props {
  immediate?: boolean;
}

export function useUserInfo({ immediate = true }: Props = {}) {
  const { userInfo, updateAuthInfo, logout } = useAuth();

  const errorLogout = useCallback(
    (msg = '') => {
      if (msg) {
        message.error(msg);
      }
      logout();
      return null;
    },
    [logout]
  );

  const fetchUser = useCallback(async () => {
    if (!userInfo?.id) {
      return errorLogout();
    }

    const { code, data, message: msg } = await getUserInfo(userInfo.id);
    if (code !== 0) {
      return errorLogout(msg);
    }
    updateAuthInfo(data);
  }, [userInfo?.id, updateAuthInfo, errorLogout]);

  const execute = () => fetchUser();

  useEffect(() => {
    if (immediate) {
      void fetchUser();
    }
  }, [immediate, fetchUser]);

  return {
    userInfo,
    execute,
  };
}
