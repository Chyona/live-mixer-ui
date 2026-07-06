import { Layout } from 'antd';
import { Link } from 'react-router-dom';
import Logo_src from '~/assets/images/logo2.png';
import { appConfig } from '~/utils/config';
import NavMenuItems from './NavMenuItems';
import UserActions from './UserActions';
import { useNavItems } from './useNavItems';

import './index.css';

const { Sider } = Layout;

const SideNav = () => {
  const { navItems, rotatedItemKey, setRotatedItemKey } = useNavItems();

  return (
    <Sider className="zt-sider" width={260} theme="light">
      <div className="zt-sider-inner">
        <Link to="/" className="zt-sider-brand">
          <img src={Logo_src} className="zt-sider-logo" alt="logo" />
          <span className="zt-sider-brand-name">{appConfig.title}</span>
        </Link>
        <div className="zt-sider-nav">
          <NavMenuItems
            items={navItems}
            variant="vertical"
            rotatedItemKey={rotatedItemKey}
            setRotatedItemKey={setRotatedItemKey}
          />
        </div>
        <div className="zt-sider-footer">
          <UserActions compact />
        </div>
      </div>
    </Sider>
  );
};

export default SideNav;
