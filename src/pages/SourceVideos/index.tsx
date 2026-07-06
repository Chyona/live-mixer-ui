import { useAppSEO } from '~/hooks/useAppSEO';

const SourceVideosPage = () => {
  useAppSEO({
    title: '源视频管理',
    path: '/source-videos',
    robots: 'noindex, nofollow',
  });

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-[var(--text-primary)]">源视频管理列表</h1>
      <p className="mt-2 text-[var(--text-gray)]">管理直播源视频，上传、预览与归档。</p>
    </div>
  );
};

export default SourceVideosPage;
