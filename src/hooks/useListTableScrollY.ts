import { useLayoutEffect, useRef, useState } from 'react';

const MIN_SCROLL_Y = 240;
const HEADER_RESERVE = 55;
const PAGINATION_RESERVE = 56;

/** 根据表格容器高度计算 Ant Table `scroll.y`，使表头与分页固定、tbody 纵向滚动 */
export function useListTableScrollY(deps: unknown[] = []) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scrollY, setScrollY] = useState<number>();

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const measure = () => {
      const wrapHeight = el.getBoundingClientRect().height;
      if (wrapHeight <= 0) return;

      const tableHeader =
        el.querySelector('.ant-table-thead')?.getBoundingClientRect().height ??
        el.querySelector('.ant-table-header')?.getBoundingClientRect().height ??
        HEADER_RESERVE;

      const paginationEl = el.querySelector('.ant-table-pagination');
      const pagination = paginationEl
        ? paginationEl.getBoundingClientRect().height
        : paginationEl === null && el.querySelector('.ant-table')
          ? 0
          : PAGINATION_RESERVE;

      const bodyScrollHeight = wrapHeight - tableHeader - pagination - 2;
      setScrollY(Math.max(MIN_SCROLL_Y, Math.floor(bodyScrollHeight)));
    };

    measure();

    const ro = new ResizeObserver(measure);
    ro.observe(el);

    const toolbar = el.closest('.list-page')?.querySelector('.list-page__toolbar');
    if (toolbar) ro.observe(toolbar);

    window.addEventListener('resize', measure);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { wrapRef, scrollY };
}
