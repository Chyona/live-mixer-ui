import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, DatePicker, Select } from 'antd';
import type { TablePaginationConfig } from 'antd/es/table';
import { LuVideo } from 'react-icons/lu';

import { useAppSEO } from '~/hooks/useAppSEO';
import { useListTableScrollY } from '~/hooks/useListTableScrollY';
import ListPageLayout from '~/components/ListPageLayout';
import ListSearchToolbar from '~/components/ListSearchToolbar';
import PageLoading from '~/components/PageLoading';
import ClipTaskList from './ClipTaskList';
import { useClipTasks } from './useClipTasks';
import { useListFilters } from '~/hooks/useListFilters';
import { buildListPagePagination, handleTablePaginationChange } from '~/utils/table';
import type { ClipTaskItemStatus } from '~/services/task';
import { CLIP_TASK_STATUS_OPTIONS } from './utils';

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

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [status, setStatus] = useState<ClipTaskItemStatus | undefined>();

  const filters = useMemo(
    () => ({
      start_date: dateFilters.date,
      end_date: dateFilters.dateEnd,
      keywords: appliedKeyword || undefined,
      status,
      page,
      page_size: pageSize,
    }),
    [appliedKeyword, dateFilters, page, pageSize, status]
  );

  const { tasks, total, loading, refreshing, polling, hasActiveTasks, reload, refreshTask } =
    useClipTasks(filters);

  const { wrapRef, scrollY, needScroll, compactPagination } = useListTableScrollY([
    loading,
    tasks.length,
    page,
    pageSize,
    total,
  ]);

  useEffect(() => {
    setPage(1);
  }, [appliedKeyword, dateFilters.date, dateFilters.dateEnd, status]);

  useEffect(() => {
    if (!loading && total > 0 && tasks.length === 0 && page > 1) {
      setPage(page - 1);
    }
  }, [loading, page, tasks.length, total]);

  const applySearch = () => {
    applyKeywordSearch();
  };

  const tablePagination = buildListPagePagination(
    {
      current: page,
      pageSize,
      total,
    },
    { compact: compactPagination }
  );

  const handleTableChange = (pagination: TablePaginationConfig) => {
    handleTablePaginationChange(pagination, setPage, setPageSize, pageSize);
  };

  const hasActiveFilters = Boolean(appliedKeyword || dateRange?.[0] || status);
  const isEmpty = !loading && total === 0;

  return (
    <ListPageLayout
      className="tasks-page"
      title="任务管理"
      description={
        <>
          统一查看「AI 选片」「生成草稿」「一键成片」任务的执行进度、状态与操作。
          {hasActiveTasks && (
            <span className="tasks-polling-hint">{polling ? '进度刷新中...' : '进行中任务将每 3 秒自动刷新'}</span>
          )}
        </>
      }
      toolbar={
        <ListSearchToolbar
          keyword={keyword}
          onKeywordChange={setKeyword}
          keywordPlaceholder="搜索项目名称 / 源视频名称（支持 关键词A+关键词B）"
          onSearch={applySearch}
          onRefresh={() => void reload()}
          refreshing={refreshing}
          hasActiveAdvancedFilters={Boolean(dateRange?.[0] || status)}
          advanced={
            <>
              <div className="list-page__filter-field">
                <span className="list-page__filter-label">状态</span>
                <Select
                  allowClear
                  placeholder="全部状态"
                  value={status}
                  options={CLIP_TASK_STATUS_OPTIONS}
                  onChange={(value) => setStatus(value)}
                />
              </div>
              <div className="list-page__filter-field">
                <span className="list-page__filter-label">日期范围</span>
                <DatePicker.RangePicker
                  value={dateRange}
                  allowClear
                  placeholder={['开始日期', '结束日期']}
                  onChange={handleDateChange}
                />
              </div>
            </>
          }
        />
      }
    >
      <div
        ref={wrapRef}
        className={[
          'list-page__table-wrap',
          'list-page__panel',
          needScroll ? 'list-page__table-wrap--scrollable' : '',
          compactPagination ? 'list-page__table-wrap--compact-pagination' : '',
          isEmpty ? 'list-page__table-wrap--empty' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        style={
          needScroll && scrollY !== undefined
            ? ({ '--list-table-body-height': `${scrollY}px` } as React.CSSProperties)
            : undefined
        }
      >
        {loading && tasks.length === 0 ? (
          <PageLoading />
        ) : (
          <ClipTaskList
            tasks={tasks}
            total={total}
            scrollY={needScroll ? scrollY : undefined}
            pagination={tablePagination}
            onTableChange={handleTableChange}
            onChanged={reload}
            onRefreshTask={refreshTask}
            empty={
              hasActiveFilters
                ? {
                  title: '未找到匹配的任务',
                  description: '试试更换关键词，或调整状态与日期范围后重新搜索',
                }
                : {
                  title: '暂无生成任务',
                    description: '在源视频切片页提交「AI 选片」「生成草稿」或「一键成片」后，任务进度会显示在这里',
                  tone: 'primary',
                  action: (
                    <Link to="/source-videos">
                      <Button type="primary" icon={<LuVideo size={16} />}>
                        前往源视频管理
                      </Button>
                    </Link>
                  ),
                }
            }
          />
        )}
      </div>
    </ListPageLayout>
  );
};

export default TasksPage;
