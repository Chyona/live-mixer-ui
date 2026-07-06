import { useAppSEO } from '~/hooks/useAppSEO';

const TasksPage = () => {
  useAppSEO({
    title: '任务管理',
    path: '/tasks',
    robots: 'noindex, nofollow',
  });

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-[var(--text-primary)]">任务管理</h1>
      <p className="mt-2 text-[var(--text-gray)]">查看切片、转码与发布任务的执行状态。</p>
    </div>
  );
};

export default TasksPage;
