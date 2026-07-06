import { Tooltip } from 'antd';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface EllipsisTooltipProps {
  /** 展示与测量的文本 */
  text?: string;
  className?: string;
  /** 悬停提示内容，默认与 text 相同 */
  title?: ReactNode;
}

/**
 * 单行省略场景：仅当文本在容器内水平溢出时包裹 Tooltip，否则不显示悬停层。
 */
export function EllipsisTooltip({ text, className, title }: EllipsisTooltipProps) {
  const textRef = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState(false);

  const measure = useCallback(() => {
    const el = textRef.current;
    if (!el || !text?.trim()) {
      setOverflow(false);
      return;
    }
    setOverflow(el.scrollWidth > el.clientWidth);
  }, [text]);

  useEffect(() => {
    measure();
  }, [measure]);

  useEffect(() => {
    const el = textRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);

  const inner = (
    <div ref={textRef} className={className}>
      {text}
    </div>
  );

  if (!text?.trim()) {
    return <div className={className} />;
  }

  const tipTitle = title !== undefined ? title : text;
  return overflow ? <Tooltip title={tipTitle}>{inner}</Tooltip> : inner;
}

export default EllipsisTooltip;
