import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getSliceEditorEntryFrom, type SliceEditorEntryFrom } from '~/routes/links';
import { RoutesCfg, type RouteCfgType } from '~/routes/const';

export const getNavActive = (
  path: string,
  currentPath: string,
  entryFrom?: SliceEditorEntryFrom
) => {
  const isSliceEditor =
    currentPath.startsWith('/videos-slice/') ||
    (currentPath.includes('/source-videos/') && currentPath.endsWith('/manual-slice'));

  if (isSliceEditor) {
    if (entryFrom === 'slices') {
      return path === '/slices';
    }

    if (entryFrom === 'tasks') {
      return path === '/tasks';
    }

    return path === '/source-videos';
  }

  if (path === '/source-videos') {
    return currentPath === path;
  }

  return path === currentPath;
};

export function useNavItems() {
  const location = useLocation();
  const entryFrom = getSliceEditorEntryFrom(location.state);

  const [navItems, setNavItems] = useState<RouteCfgType[]>(() =>
    RoutesCfg.map((item) => ({
      ...item,
      active: getNavActive(item.path, location.pathname, entryFrom),
    }))
  );
  const [rotatedItemKey, setRotatedItemKey] = useState<string | null>(null);

  useEffect(() => {
    const nextEntryFrom = getSliceEditorEntryFrom(location.state);

    setNavItems((prev) =>
      prev.map((item) => ({
        ...item,
        active: getNavActive(item.path, location.pathname, nextEntryFrom),
      }))
    );
  }, [location.pathname, location.state]);

  return { navItems, rotatedItemKey, setRotatedItemKey };
}
