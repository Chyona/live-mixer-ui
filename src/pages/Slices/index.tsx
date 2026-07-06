import { useAppSEO } from '~/hooks/useAppSEO';

const SlicesPage = () => {
  useAppSEO({
    title: '切片管理',
    path: '/slices',
    robots: 'noindex, nofollow',
  });

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-[var(--text-primary)]">切片管理列表</h1>
      <p className="mt-2 text-[var(--text-gray)]">查看、编辑与发布直播切片内容。</p>
    </div>
  );
};

export default SlicesPage;
