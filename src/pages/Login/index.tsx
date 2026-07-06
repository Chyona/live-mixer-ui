import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import LoginModal from '~/components/LoginModal';
import LoginMask from '~/components/LoginMask';
import { useAppSEO } from '~/hooks/useAppSEO';
import { useAuth } from '~/context/AuthContext';
import { buildReturnPath, openLogin, type LoginFrom } from '~/utils/loginFlow';

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
      const returnTo = from?.pathname ? buildReturnPath(from) : '/';
      navigate(returnTo, { replace: true });
    }
  }, [userInfo?.id, location.state, navigate]);

  return (
    <div className="login-page relative">
      <LoginMask />
      <div className="gradient-overlay" />
      <LoginModal />
    </div>
  );
};

export default LoginPage;
