import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { RoutesCfg, type RouteCfgType } from '~/routes/const';

export const getNavActive = (path: string, currentPath: string) => {
  const isSliceEditor = currentPath.includes('/source-videos/') && currentPath.endsWith('/slice');

  if (isSliceEditor) {
    return path === '/source-videos';
  }

  if (path === '/source-videos') {
    return currentPath === path;
  }

  return path === currentPath;
};

export function useNavItems() {
  const location = useLocation();

  const [navItems, setNavItems] = useState<RouteCfgType[]>(() =>
    RoutesCfg.map((item) => ({
      ...item,
      active: getNavActive(item.path, location.pathname),
    }))
  );
  const [rotatedItemKey, setRotatedItemKey] = useState<string | null>(null);

  useEffect(() => {
    setNavItems((prev) =>
      prev.map((item) => ({
        ...item,
        active: getNavActive(item.path, location.pathname),
      }))
    );
  }, [location.pathname]);

  return { navItems, rotatedItemKey, setRotatedItemKey };
}
