import { Suspense, useEffect } from 'react';
import { Navigate, Routes, Route, useNavigate } from 'react-router-dom';
import { Spin } from 'antd';
import { setupHttpInterceptors } from '~/services/http';
import { ProtectedRoute } from '~/context/AuthContext';
import { isLoginPageMode } from '~/utils/config';
import { AuthLayout, MainLayout } from '~/layouts';
import GtmRouterTracker from './gtmRouterTracker';
import NotFound from '~/pages/404';
import { LoginRoute, ErrorPage, RoutesCfg, isAppRoute } from './const';

const PageFallback = () => (
  <div className="flex size-full items-center justify-center">
    <Spin size="large" />
  </div>
);

const menuRoutes = RoutesCfg.filter(isAppRoute);
const publicRoutes = menuRoutes.filter((route) => route.public);
const protectedRoutes = menuRoutes.filter((route) => !route.public);

const AppRoutes = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const teardown = setupHttpInterceptors(navigate);
    return teardown;
  }, [navigate]);

  return (
    <>
      <GtmRouterTracker />
      <Suspense fallback={<PageFallback />}>
        <Routes>
          {isLoginPageMode ? (
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<LoginRoute />} />
            </Route>
          ) : (
            <Route path="/login" element={<Navigate to="/" replace />} />
          )}

          <Route element={<MainLayout />}>
            {publicRoutes.map((route) => {
              const Page = route.element;
              return <Route key={route.path} path={route.path} element={<Page />} />;
            })}
            <Route path="/error" element={<ErrorPage />} />
            <Route element={<ProtectedRoute />}>
              {protectedRoutes.map((route) => {
                const Page = route.element;
                return <Route key={route.path} path={route.path} element={<Page />} />;
              })}
            </Route>
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Suspense>
    </>
  );
};

export default AppRoutes;
