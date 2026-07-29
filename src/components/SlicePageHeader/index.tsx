import type { ReactNode } from 'react';
import { Breadcrumb } from 'antd';
import type { BreadcrumbProps } from 'antd';
import tipIcon from '~/assets/videos/tip-icon.png';

import './index.css';

export interface SlicePageToolbarProps {
  /** 为空则不渲染大标题 */
  title?: string;
  description?: string;
  /** 左侧区域（如模式 Tabs） */
  leading?: ReactNode;
  actions?: ReactNode;
  tip?: {
    text: string;
    onClick?: () => void;
  };
  className?: string;
}

interface SlicePageHeaderProps extends SlicePageToolbarProps {
  breadcrumbItems: BreadcrumbProps['items'];
}

export const SlicePageBreadcrumb = ({ items }: { items: BreadcrumbProps['items'] }) => (
  <Breadcrumb className="slice-page-breadcrumb" items={items} />
);

export const SlicePageToolbar = ({
  title,
  description,
  leading,
  actions,
  tip,
  className,
}: SlicePageToolbarProps) => {
  const hasTitle = Boolean(title?.trim());
  const hasLeft = hasTitle || Boolean(description) || Boolean(leading);
  const hasRight = Boolean(tip || actions);

  if (!hasLeft && !hasRight) {
    return null;
  }

  return (
    <div
      className={[
        'slice-page-header-main',
        !hasTitle ? 'slice-page-header-main_toolbar' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {hasLeft ? (
        <div className="slice-page-header-left">
          {hasTitle ? <h1 className="slice-page-title">{title}</h1> : null}
          {description ? <p className="slice-page-desc">{description}</p> : null}
          {leading}
        </div>
      ) : (
        <div />
      )}
      {hasRight ? (
        <div className="slice-page-header-right">
          {tip ? (
            <button type="button" className="slice-page-tip" onClick={tip.onClick}>
              <span>{tip.text}</span>
              <img src={tipIcon} className="slice-page-tip-icon" alt="提示" />
            </button>
          ) : null}
          {actions ? <div className="slice-page-actions">{actions}</div> : null}
        </div>
      ) : null}
    </div>
  );
};

const SlicePageHeader = ({
  breadcrumbItems,
  title,
  description,
  leading,
  actions,
  tip,
}: SlicePageHeaderProps) => {
  return (
    <div className="slice-page-header">
      <SlicePageBreadcrumb items={breadcrumbItems} />
      <SlicePageToolbar
        title={title}
        description={description}
        leading={leading}
        actions={actions}
        tip={tip}
      />
    </div>
  );
};

export default SlicePageHeader;
