import type { NavigateFunction } from 'react-router-dom';

// 全局导航解决方案
let globalNavigate: NavigateFunction | null = null;

export const setGlobalNavigate = (navigate: NavigateFunction | null) => {
  globalNavigate = navigate;
};

export const navigateTo = (path: string, state?: any) => {
  if (globalNavigate) {
    globalNavigate(path, { state });
  } else {
    console.warn('导航函数尚未初始化，使用原生导航');
    window.location.href = path;
  }
};
