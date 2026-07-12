import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import LoginModal from '~/components/LoginModal';
import { useAppSEO } from '~/hooks/useAppSEO';
import { useAuth } from '~/context/AuthContext';
import { buildReturnPath, openLogin, type LoginFrom } from '~/utils/loginFlow';
import { DEFAULT_APP_PATH } from '~/routes/const';

import './index.css';

const LoginPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { userInfo } = useAuth();

  useAppSEO({
    title: '登录',
    path: '/login',
    description: '登录您的账户',
    robots: 'noindex, nofollow',
    twitterCard: 'summary',
  });

  useEffect(() => {
    openLogin(location);
  }, [location]);

  useEffect(() => {
    if (userInfo?.id) {
      const from = (location.state as { from?: LoginFrom })?.from;
      const returnTo = from?.pathname ? buildReturnPath(from) : DEFAULT_APP_PATH;
      navigate(returnTo, { replace: true });
    }
  }, [userInfo?.id, location.state, navigate]);

  return (
    <div className="login-page">
      <div className="login-page-bg" aria-hidden>
        <div className="login-page-bg__base" />
        <div className="login-page-bg__mesh" />
        <div className="login-page-bg__blob login-page-bg__blob_purple" />
        <div className="login-page-bg__blob login-page-bg__blob_lavender" />
        <div className="login-page-bg__blob login-page-bg__blob_pink" />
        <div className="login-page-bg__blob login-page-bg__blob_blue" />
      </div>

      <div className="login-page-content">
        <LoginModal closeIcon={false} mask={false} />
      </div>
    </div>
  );
};

export default LoginPage;
