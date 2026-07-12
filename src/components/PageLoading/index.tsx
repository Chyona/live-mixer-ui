import { Spin } from 'antd';

interface PageLoadingProps {
  className?: string;
}

const PageLoading = ({ className }: PageLoadingProps) => {
  return (
    <div className={['page-loading', className].filter(Boolean).join(' ')}>
      <Spin size="large" />
    </div>
  );
};

export default PageLoading;
