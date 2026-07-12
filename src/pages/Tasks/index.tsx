import { useMemo, useState } from 'react';
import { Button, DatePicker } from 'antd';

import { useAppSEO } from '~/hooks/useAppSEO';
import ListPageLayout from '~/components/ListPageLayout';
import ListSearchToolbar from '~/components/ListSearchToolbar';
import PageLoading from '~/components/PageLoading';
import ClipTaskList from './ClipTaskList';
import { useClipTasks } from './useClipTasks';
import { useListFilters } from '~/hooks/useListFilters';

import './index.css';

const TasksPage = () => {
  useAppSEO({
    title: '任务管理',
    path: '/tasks',
    robots: 'noindex, nofollow',
  });

  const {
    keyword,
    setKeyword,
    appliedKeyword,
    applySearch: applyKeywordSearch,
    dateRange,
    handleDateChange,
    dateFilters,
  } = useListFilters();

  const filters = useMemo(
    () => ({
      date: dateFilters.date,
      dateEnd: dateFilters.dateEnd,
      keyword: appliedKeyword || undefined,
    }),
    [appliedKeyword, dateFilters]
  );

  const { tasks, loading, polling, hasActiveTasks, reload, refreshTask } = useClipTasks(filters);

  const applySearch = () => {
    applyKeywordSearch();
  };

  return (
    <ListPageLayout
      className="tasks-page"
      title="任务管理"
      description={
        <>
          统一查看「一键成片」与「AI 选片」生成任务的执行进度、状态与操作。
          {hasActiveTasks && (
            <span className="tasks-polling-hint">{polling ? '进度刷新中...' : '进行中任务将每 3 秒自动刷新'}</span>
          )}
        </>
      }
      toolbar={
        <ListSearchToolbar
          keyword={keyword}
          onKeywordChange={setKeyword}
          keywordPlaceholder="任务名称 / 源视频名称（支持 关键词A+关键词B）"
          onSearch={applySearch}
          hasActiveAdvancedFilters={Boolean(dateRange?.[0])}
          advanced={
            <div className="list-page__filter-field">
              <span className="list-page__filter-label">日期范围</span>
              <DatePicker.RangePicker
                value={dateRange}
                allowClear
                placeholder={['开始日期', '结束日期']}
                onChange={handleDateChange}
              />
            </div>
          }
        />
      }
    >
      <div className="list-page__panel">
        {loading ? (
          <PageLoading />
        ) : (
          <ClipTaskList tasks={tasks} onChanged={reload} onRefreshTask={refreshTask} />
        )}
      </div>
    </ListPageLayout>
  );
};

export default TasksPage;
