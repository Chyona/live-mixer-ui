import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, DatePicker, Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { LuSearch, LuTextSelect } from 'react-icons/lu';

import EllipsisTooltip from '~/components/EllipsisTooltip';
import ListPageLayout from '~/components/ListPageLayout';
import ListPageTable from '~/components/ListPageTable';
import ListSearchToolbar from '~/components/ListSearchToolbar';
import RemarkEditor from '~/components/RemarkEditor';
import { useAppSEO } from '~/hooks/useAppSEO';
import { useListFilters } from '~/hooks/useListFilters';
import { buildSliceProjectEditLink } from '~/routes/links';
import { AppError } from '~/services/http';
import {
  fetchSliceProjectList,
  updateSliceProjectName,
  type SliceProject,
} from '~/services/sliceProject';
import { formatToDateTime } from '~/utils/date';
import { DEFAULT_TABLE_PAGINATION, handleTablePaginationChange } from '~/utils/table';
import { showAppError, showScopedError, handleRequestError, toast } from '~/utils/toast';

const SLICES_LIST_ERROR_SCOPE = 'slices-list';

const SlicesPage = () => {
  const navigate = useNavigate();

  useAppSEO({
    title: '项目管理',
    path: '/slices',
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
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const hasLoadedRef = useRef(false);
  const [list, setList] = useState<SliceProject[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const loadList = useCallback(async (options?: { silent?: boolean; refresh?: boolean }) => {
    const silent = options?.silent ?? options?.refresh ?? hasLoadedRef.current;
    const refresh = options?.refresh ?? false;

    if (refresh) {
      setRefreshing(true);
    } else if (!silent) {
      setLoading(true);
    }

    try {
      const response = await fetchSliceProjectList({
        date: dateFilters.date,
        dateEnd: dateFilters.dateEnd,
        keyword: appliedKeyword || undefined,
        page,
        pageSize,
      });

      if (response.code !== 0) {
        if (!silent && !refresh) {
          showScopedError(SLICES_LIST_ERROR_SCOPE, response.message || '加载剪辑项目失败');
        }
        return;
      }

      setList(response.data.list);
      setTotal(response.data.total);
      hasLoadedRef.current = true;
    } catch (error) {
      if (!silent && !refresh) {
        handleRequestError(SLICES_LIST_ERROR_SCOPE, error, '加载剪辑项目失败');
      }
    } finally {
      if (refresh) {
        setRefreshing(false);
      } else if (!silent) {
        setLoading(false);
      }
    }
  }, [appliedKeyword, dateFilters, page, pageSize]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const applySearch = () => {
    applyKeywordSearch();
    setPage(1);
  };

  const onDateChange = (value: Parameters<typeof handleDateChange>[0]) => {
    handleDateChange(value);
    setPage(1);
  };

  const handleProjectNameSave = async (id: string, projectName: string) => {
    try {
      const response = await updateSliceProjectName(id, projectName);
      if (response.code !== 0) {
        toast.notify.error(response.message || '项目名称保存失败');
        return;
      }

      setList((prev) =>
        prev.map((item) => (item.id === id ? { ...item, projectName: response.data.projectName } : item))
      );
      toast.notify.success('项目名称已保存');
    } catch (error) {
      if (error instanceof AppError) {
        showAppError(error);
      } else {
        toast.notify.error('项目名称保存失败');
      }
    }
  };

  const columns = useMemo<ColumnsType<SliceProject>>(
    () => [
      {
        title: '项目名称',
        dataIndex: 'projectName',
        key: 'projectName',
        render: (projectName: string, record) => (
          <RemarkEditor
            value={projectName}
            placeholder="输入项目名称"
            onSave={(value) => handleProjectNameSave(record.id, value)}
          />
        ),
      },
      {
        title: '源视频名称',
        dataIndex: 'sourceVideoName',
        key: 'sourceVideoName',
        ellipsis: true,
        render: (name: string) => <EllipsisTooltip text={name || '-'} className="list-page__cell-ellipsis" />,
      },
      {
        title: '备注名称',
        dataIndex: 'remarkName',
        key: 'remarkName',
        ellipsis: true,
        render: (name: string) => <EllipsisTooltip text={name || '-'} className="list-page__cell-ellipsis" />,
      },
      {
        title: '片段数',
        dataIndex: 'segmentCount',
        key: 'segmentCount',
        width: 100,
        align: 'center',
      },
      {
        title: '更新时间',
        dataIndex: 'updatedAt',
        key: 'updatedAt',
        width: 160,
        render: (value: string) => formatToDateTime(value),
      },
      {
        title: '操作',
        key: 'actions',
        width: 120,
        fixed: 'right',
        render: (_, record) => (
          <Space size={8}>
            <Button
              type="link"
              size="small"
              className="list-page__action-btn"
              icon={<LuTextSelect size={14} />}
              onClick={() =>
                navigate(buildSliceProjectEditLink(record.sourceVideoId, record.projectSource), {
                  state: { from: 'slices' },
                })
              }
            >
              编辑项目
            </Button>
          </Space>
        ),
      },
    ],
    [navigate]
  );

  return (
    <ListPageLayout
      className="slices-page"
      title="项目管理"
      description="管理每个源视频对应的剪辑项目，单视频对应一个可二次编辑的切片项目。"
      toolbar={
        <ListSearchToolbar
          keyword={keyword}
          onKeywordChange={setKeyword}
          keywordPlaceholder="搜索项目名称 / 源视频名称 / 备注名称（支持 关键词A+关键词B）"
          onSearch={applySearch}
          onRefresh={() => void loadList({ refresh: true })}
          refreshing={refreshing}
          hasActiveAdvancedFilters={Boolean(dateRange?.[0])}
          advanced={
            <div className="list-page__filter-field">
              <span className="list-page__filter-label">日期范围</span>
              <DatePicker.RangePicker
                value={dateRange}
                allowClear
                placeholder={['开始日期', '结束日期']}
                onChange={onDateChange}
              />
            </div>
          }
        />
      }
    >
      <ListPageTable<SliceProject>
        rowKey="id"
        loading={loading && list.length === 0}
        columns={columns}
        dataSource={list}
        scrollX={1100}
        pagination={{
          current: page,
          pageSize,
          total,
          ...DEFAULT_TABLE_PAGINATION,
        }}
        onChange={(pagination) => handleTablePaginationChange(pagination, setPage, setPageSize, pageSize)}
      />
    </ListPageLayout>
  );
};

export default SlicesPage;
