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
      <div className="login-page-bg" aria-hidden="true">
        <div className="login-page-bg__mesh" />
        <div className="login-page-bg__grid" />
        <div className="login-page-bg__scanline" />

        <div className="login-page-bg__frames">
          <span className="login-frame login-frame--1" />
          <span className="login-frame login-frame--2" />
          <span className="login-frame login-frame--3" />
        </div>

        <div className="login-page-bg__waveform">
          {Array.from({ length: 28 }, (_, i) => (
            <span key={i} className="login-waveform-bar" style={{ '--i': i } as React.CSSProperties} />
          ))}
        </div>

        <div className="login-page-bg__timeline">
          <div className="login-timeline-ruler">
            {Array.from({ length: 12 }, (_, i) => (
              <span key={i} className="login-timeline-tick" />
            ))}
          </div>
          <div className="login-timeline-track">
            <span className="login-clip login-clip--1" />
            <span className="login-clip login-clip--2" />
            <span className="login-clip login-clip--3" />
            <span className="login-playhead" />
          </div>
        </div>

        <div className="login-page-bg__live">
          <span className="login-live-dot" />
          LIVE
        </div>
      </div>

      <div className="login-page-content">
        <LoginModal closeIcon={false} mask={false} />
      </div>
    </div>
  );
};

export default LoginPage;
