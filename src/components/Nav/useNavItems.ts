import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { RoutesCfg, type RouteCfgType } from '~/routes/const';

export const defaultHomeActive = (path: string, currentPath: string) => path === currentPath;

export function useNavItems() {
  const location = useLocation();
  const [navItems, setNavItems] = useState<RouteCfgType[]>(() =>
    RoutesCfg.map((item) => ({
      ...item,
      active: defaultHomeActive(item.path, location.pathname),
    }))
  );
  const [rotatedItemKey, setRotatedItemKey] = useState<string | null>(null);

  useEffect(() => {
    setNavItems((prev) =>
      prev.map((item) => ({
        ...item,
        active: defaultHomeActive(item.path, location.pathname),
      }))
    );
  }, [location.pathname]);

  return { navItems, rotatedItemKey, setRotatedItemKey };
}
