import { Spin } from 'antd';
import { useAppSEO } from '~/hooks/useAppSEO';
import ClipTaskList from './ClipTaskList';
import { useClipTasks } from './useClipTasks';
import './index.css';

const TasksPage = () => {
  useAppSEO({
    title: '任务管理',
    path: '/tasks',
    robots: 'noindex, nofollow',
  });

  const { tasks, loading, reload } = useClipTasks();

  return (
    <div className="tasks-page">
      <div className="tasks-header">
        <div>
          <h1 className="tasks-title">任务管理</h1>
          <p className="tasks-desc">查看切片生成任务的执行进度与结果。</p>
        </div>
        <button type="button" className="tasks-refresh-btn" onClick={() => void reload()}>
          刷新
        </button>
      </div>

      <div className="tasks-panel">
        {loading ? (
          <div className="tasks-loading">
            <Spin />
          </div>
        ) : (
          <ClipTaskList tasks={tasks} />
        )}
      </div>
    </div>
  );
};

export default TasksPage;
