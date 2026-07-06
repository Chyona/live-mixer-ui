import { Avatar, Button, Divider, Dropdown, Flex, Typography } from 'antd';
import { FaSignOutAlt, FaUser } from 'react-icons/fa';
import { useAuth } from '~/context/AuthContext';
import type { UserLoginResult } from '~/services/login';
import { openLogin } from '~/utils/loginFlow';

type UserActionsProps = {
  compact?: boolean;
};

const userDropdownMenu = (userInfo: Partial<UserLoginResult>, logout: () => void) => ({
  className: 'user-dropdown-menu',
  items: [
    {
      key: 'user-info',
      label: (
        <>
          <div className="user-dropdown-info">
            <div className="user-dropdown-avatar">
              <Avatar size={48}>
                <FaUser size={24} />
              </Avatar>
            </div>
            <div className="user-dropdown-details">
              <div className="user-dropdown-name">{userInfo.name || '未登录'}</div>
              <div className="user-dropdown-id">
                ID: {userInfo.id || '-'}
                <Typography.Text
                  copyable={{ text: String(userInfo.id || '-') }}
                  className="ml-1 packages-user-id-copy"
                />
              </div>
            </div>
          </div>
          <Divider className="my-3" />
          <Flex className="user-dropdown-logout px-[12px] pt-1 pb-2">
            <Button
              color="default"
              variant="filled"
              className="user-dropdown-logout-btn flex-1"
              onClick={() => logout()}
            >
              <FaSignOutAlt size={18} />
              <span>退出登录</span>
            </Button>
          </Flex>
        </>
      ),
      disabled: true,
    },
  ],
});

const UserActions = ({ compact }: UserActionsProps) => {
  const { userInfo = {}, logout } = useAuth();

  if (userInfo?.id) {
    if (compact) {
      return (
        <Dropdown menu={userDropdownMenu(userInfo, logout)} trigger={['click']}>
          <button type="button" className="zt-sider-user-panel">
            <Avatar size={40} className="zt-sider-user-avatar">
              {userInfo.name?.slice(0, 1) || <FaUser size={18} />}
            </Avatar>
            <Flex vertical align="flex-start" className="zt-sider-user-meta">
              <span className="zt-sider-user-name">{userInfo.name || '未登录'}</span>
              <span className="zt-sider-user-id">
                ID: {userInfo.id || '-'}
                <Typography.Text
                  copyable={{ text: userInfo.id || '-' }}
                  className="zt-sider-user-id-copy"
                  onClick={(e) => e.stopPropagation()}
                />
              </span>
            </Flex>
          </button>
        </Dropdown>
      );
    }

    return (
      <Dropdown menu={userDropdownMenu(userInfo, logout)}>
        <Flex className="nav-user-avatar" align="center">
          {userInfo.name?.slice(0, 1)}
        </Flex>
      </Dropdown>
    );
  }

  return (
    <Button
      type="primary"
      className={`login-btn ${compact ? 'login-btn_compact' : ''}`}
      block={compact}
      onClick={() => openLogin()}
    >
      登录
    </Button>
  );
};

export default UserActions;
