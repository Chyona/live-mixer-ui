import { Dropdown } from 'antd';
import { FaCaretDown } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { type RouteCfgType } from '~/routes/const';

type NavMenuItemsProps = {
  items: RouteCfgType[];
  variant?: 'horizontal' | 'vertical';
  rotatedItemKey?: string | null;
  setRotatedItemKey?: (key: string | null) => void;
  showMenu?: boolean;
  setShowMenu?: (show: boolean) => void;
};

const NavMenuItems = ({
  items,
  variant = 'horizontal',
  rotatedItemKey = null,
  setRotatedItemKey = () => {},
  showMenu = false,
  setShowMenu = () => {},
}: NavMenuItemsProps) => {
  const isVertical = variant === 'vertical';
  const navClassName = isVertical ? 'zt-nav zt-nav_vertical' : 'zt-nav';

  const renderIconText = (item: RouteCfgType) => (
    <>
      <item.icon size={20} {...item.iconProps} />
      {item.text}
      {item.links && (
        <FaCaretDown
          size={14}
          className={`ml-1 ${rotatedItemKey === item.path ? 'rotate-icon' : ''}`}
        />
      )}
    </>
  );

  return (
    <div className={navClassName}>
      {items.map((item) => {
        if (item.hideInMenu) return null;

        if (item.links) {
          const menuProps = {
            className: 'nav-dropdown-menu',
            items: item.links.map((link, linkIndex) => ({
              key: linkIndex,
              label: (
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                  onClick={() => setShowMenu(!showMenu)}
                >
                  <link.icon size={20} />
                  {link.text}
                </a>
              ),
            })),
            onMouseEnter: () => setRotatedItemKey(item.path),
            onMouseLeave: () => setRotatedItemKey(null),
          };

          return (
            <Dropdown
              key={item.path}
              menu={menuProps}
              placement={isVertical ? 'bottomRight' : 'bottom'}
            >
              <a
                className={`nav-item ${rotatedItemKey === item.path ? 'hover' : ''}`}
                onClick={(e) => e.preventDefault()}
                onMouseEnter={() => setRotatedItemKey(item.path)}
                onMouseLeave={() => setRotatedItemKey(null)}
              >
                {renderIconText(item)}
              </a>
            </Dropdown>
          );
        }

        if (item.href) {
          return (
            <a
              className="nav-item"
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              key={item.path}
              onClick={() => setShowMenu(!showMenu)}
            >
              {renderIconText(item)}
            </a>
          );
        }

        return (
          <Link
            key={item.path}
            to={item.path}
            onClick={() => setShowMenu(!showMenu)}
            className={`nav-item ${item.active ? 'active' : ''}`}
          >
            {renderIconText(item)}
          </Link>
        );
      })}
    </div>
  );
};

export default NavMenuItems;
