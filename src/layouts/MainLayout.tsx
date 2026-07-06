import { Layout } from 'antd';
import { Outlet } from 'react-router-dom';

import Header from '~/components/Header';
import FloatCom from '~/components/Float';
import LoginModal from '~/components/LoginModal';
import { MobileBottomNav, SideNav } from '~/components/Nav';
import { useResponsive } from '~/hooks';
import { appConfig, isLeftNavLayout, isLoginModalMode } from '~/utils/config';

const { Content } = Layout;

/** 带导航、悬浮客服等应用主壳布局 */
const MainLayout = () => {
  const { isPhone } = useResponsive();

  const contentClassName = [
    'zt-app-main',
    isPhone ? 'zt-app-main_mobile' : '',
    !isPhone && isLeftNavLayout ? 'zt-app-main_with-sider' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const mainContent = (
    <Content className={contentClassName}>
      <Outlet />
      {appConfig.enableFloat && <FloatCom />}
      {isLoginModalMode && <LoginModal />}
    </Content>
  );

  if (isPhone) {
    return (
      <Layout className="zt-app zt-app--mobile">
        <MobileBottomNav />
        {mainContent}
      </Layout>
    );
  }

  if (isLeftNavLayout) {
    return (
      <Layout className="zt-app zt-app--left-nav">
        <Layout hasSider className="zt-app-body">
          <SideNav />
          <Layout>{mainContent}</Layout>
        </Layout>
      </Layout>
    );
  }

  return (
    <Layout className="zt-app zt-app--top-nav">
      <Header />
      {mainContent}
    </Layout>
  );
};

export default MainLayout;
