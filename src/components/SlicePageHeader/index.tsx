import type { ReactNode } from 'react';
import { Breadcrumb } from 'antd';
import type { BreadcrumbProps } from 'antd';
import tipIcon from '~/assets/videos/tip-icon.png';

import './index.css';

interface SlicePageHeaderProps {
  breadcrumbItems: BreadcrumbProps['items'];
  title: string;
  description: string;
  actions?: ReactNode;
  tip?: {
    text: string;
    onClick?: () => void;
  };
}

const SlicePageHeader = ({
  breadcrumbItems,
  title,
  description,
  actions,
  tip,
}: SlicePageHeaderProps) => {
  return (
    <div className="slice-page-header">
      <Breadcrumb className="slice-page-breadcrumb" items={breadcrumbItems} />

      <div className="slice-page-header-main">
        <div>
          <h1 className="slice-page-title">{title}</h1>
          <p className="slice-page-desc">{description}</p>
        </div>
        {tip || actions ? (
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
    </div>
  );
};

export default SlicePageHeader;
