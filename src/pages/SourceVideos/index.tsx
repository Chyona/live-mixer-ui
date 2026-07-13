import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, DatePicker, Input, Popconfirm, Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { LuCirclePlay, LuPlus, LuTextSelect, LuTrash2 } from 'react-icons/lu';

import DisabledActionWrap from '~/components/DisabledActionWrap';
import EllipsisTooltip from '~/components/EllipsisTooltip';
import ListPageLayout from '~/components/ListPageLayout';
import ListPageTable from '~/components/ListPageTable';
import ListSearchToolbar from '~/components/ListSearchToolbar';
import RemarkEditor from '~/components/RemarkEditor';
import { useAppSEO } from '~/hooks/useAppSEO';
import { useListFilters } from '~/hooks/useListFilters';
import { buildManualVideoSliceLink, buildSourceVideoSliceLink } from '~/routes/links';
import { AppError } from '~/services/http';
import {
  deleteSourceVideo,
  fetchSourceVideoList,
  retrySourceVideoAsr,
  updateSourceVideoRemark,
  type SourceVideo,
} from '~/services/sourceVideo';
import { formatToDate } from '~/utils/date';
import { formatVideoDuration } from '~/utils/duration';
import { DEFAULT_TABLE_PAGINATION, handleTablePaginationChange } from '~/utils/table';
import { showAppError, showScopedError, handleRequestError, toast } from '~/utils/toast';

const SOURCE_VIDEOS_LIST_ERROR_SCOPE = 'source-videos-list';

import AddSourceVideoModal from './AddSourceVideoModal';
import AsrProgressCell from './AsrProgressCell';
import { getAsrActionDisabledReason } from './asrUtils';
import './index.css';

function renderSliceAction(options: {
  to: string;
  icon: ReactNode;
  label: string;
  disabledReason: string | null;
  onNavigate: (to: string) => void;
}) {
  const button = (
    <Button
      type="link"
      size="small"
      className="list-page__action-btn"
      icon={options.icon}
      disabled={!!options.disabledReason}
      onClick={() => options.onNavigate(options.to)}
    >
      {options.label}
    </Button>
  );

  return <DisabledActionWrap disabledReason={options.disabledReason}>{button}</DisabledActionWrap>;
}

const SourceVideosPage = () => {
  const navigate = useNavigate();

  useAppSEO({
    title: '源视频管理',
    path: '/source-videos',
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
  const [globalKeyword, setGlobalKeyword] = useState('');
  const [appliedGlobalKeyword, setAppliedGlobalKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const hasLoadedRef = useRef(false);
  const [list, setList] = useState<SourceVideo[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [retryingAsrId, setRetryingAsrId] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const loadList = useCallback(async (options?: { silent?: boolean; refresh?: boolean }) => {
    const silent = options?.silent ?? options?.refresh ?? hasLoadedRef.current;
    const refresh = options?.refresh ?? false;

    if (refresh) {
      setRefreshing(true);
    } else if (!silent) {
      setLoading(true);
    }

    try {
      const response = await fetchSourceVideoList({
        date: dateFilters.date,
        dateEnd: dateFilters.dateEnd,
        keyword: appliedKeyword || undefined,
        globalKeyword: appliedGlobalKeyword || undefined,
        page,
        pageSize,
      });

      if (response.code !== 0) {
        if (!silent && !refresh) {
          showScopedError(SOURCE_VIDEOS_LIST_ERROR_SCOPE, response.message || '加载源视频列表失败');
        }
        return;
      }

      setList(response.data.list);
      setTotal(response.data.total);
      hasLoadedRef.current = true;
    } catch (error) {
      if (!silent && !refresh) {
        handleRequestError(SOURCE_VIDEOS_LIST_ERROR_SCOPE, error, '加载源视频列表失败');
      }
    } finally {
      if (refresh) {
        setRefreshing(false);
      } else if (!silent) {
        setLoading(false);
      }
    }
  }, [appliedGlobalKeyword, appliedKeyword, dateFilters, page, pageSize]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const hasProcessingAsr = useMemo(
    () => list.some((item) => item.asr_status === 'pending' || item.asr_status === 'processing'),
    [list]
  );

  useEffect(() => {
    if (!hasProcessingAsr) return;

    const timer = window.setInterval(() => {
      void loadList({ silent: true });
    }, 2000);

    return () => window.clearInterval(timer);
  }, [hasProcessingAsr, loadList]);

  const applySearch = () => {
    applyKeywordSearch();
    setAppliedGlobalKeyword(globalKeyword.trim());
    setPage(1);
  };

  const onDateChange = (value: Parameters<typeof handleDateChange>[0]) => {
    handleDateChange(value);
    setPage(1);
  };

  const handleRemarkSave = async (id: number, remark: string) => {
    try {
      const response = await updateSourceVideoRemark(id, remark);
      if (response.code !== 0) {
        toast.notify.error(response.message || '备注保存失败');
        return;
      }

      setList((prev) =>
        prev.map((item) => (item.id === id ? { ...item, remark: response.data.remark } : item))
      );
      toast.notify.success('备注已保存');
    } catch (error) {
      if (error instanceof AppError) {
        showAppError(error);
      } else {
        toast.notify.error('备注保存失败');
      }
    }
  };

  const handleRetryAsr = async (id: number) => {
    setRetryingAsrId(id);
    try {
      const response = await retrySourceVideoAsr(id);
      if (response.code !== 0) {
        toast.notify.error(response.message || '重新解析失败');
        return;
      }

      setList((prev) => prev.map((item) => (item.id === id ? response.data : item)));
      toast.notify.success('已提交重新解析，请稍候');
    } catch (error) {
      if (error instanceof AppError) {
        showAppError(error);
      } else {
        toast.notify.error('重新解析失败');
      }
    } finally {
      setRetryingAsrId(null);
    }
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      const response = await deleteSourceVideo(id);
      if (response.code !== 0) {
        toast.notify.error(response.message || '删除失败');
        return;
      }

      toast.notify.success('已删除源视频');
      if (list.length === 1 && page > 1) {
        setPage((prev) => prev - 1);
      } else {
        await loadList();
      }
    } catch (error) {
      if (error instanceof AppError) {
        showAppError(error);
      } else {
        toast.notify.error('删除失败');
      }
    } finally {
      setDeletingId(null);
    }
  };

  const columns = useMemo<ColumnsType<SourceVideo>>(
    () => [
      {
        title: '源视频名称',
        dataIndex: 'name',
        key: 'name',
        ellipsis: true,
        render: (name: string) => <EllipsisTooltip text={name} className="list-page__cell-ellipsis" />,
      },
      // {
      //   title: '直播地址',
      //   dataIndex: 'liveUrl',
      //   key: 'liveUrl',
      //   width: 220,
      //   ellipsis: true,
      //   render: (liveUrl: string) =>
      //     liveUrl ? (
      //       <a
      //         href={liveUrl}
      //         target="_blank"
      //         rel="noopener noreferrer"
      //         className="source-videos-live-url"
      //       >
      //         <EllipsisTooltip text={liveUrl} className="source-videos-cell-ellipsis" />
      //       </a>
      //     ) : (
      //       '-'
      //     ),
      // },
      {
        title: '备注名称',
        dataIndex: 'remark',
        key: 'remark',
        render: (remark: string, record) => (
          <RemarkEditor value={remark} onSave={(value) => handleRemarkSave(record.id, value)} />
        ),
      },
      {
        title: '时长',
        dataIndex: 'duration',
        key: 'duration',
        width: 100,
        render: (duration: number) => formatVideoDuration(duration),
      },
      {
        title: '时间',
        dataIndex: 'created_at',
        key: 'created_at',
        width: 160,
        render: (created_at: string) => formatToDate(created_at),
      },
      {
        title: 'ASR解析进度',
        key: 'asr_progress',
        width: 180,
        render: (_, record) => (
          <AsrProgressCell
            status={record.asr_status}
            progress={record.asr_progress}
            errorMessage={record.asr_error_msg}
            retrying={retryingAsrId === record.id}
            onRetry={
              record.asr_status === 'failed'
                ? () => void handleRetryAsr(record.id)
                : undefined
            }
          />
        ),
      },
      {
        title: '操作',
        key: 'actions',
        width: 280,
        fixed: 'right',
        render: (_, record) => {
          const asrDisabledReason = getAsrActionDisabledReason(
            record.asr_status,
            record.asr_error_msg
          );

          return (
            <Space size={8}>
              {renderSliceAction({
                to: buildSourceVideoSliceLink(String(record.id)),
                icon: <LuCirclePlay size={14} />,
                label: '进入选片',
                disabledReason: asrDisabledReason,
                onNavigate: navigate,
              })}
              {renderSliceAction({
                to: buildManualVideoSliceLink(String(record.id)),
                icon: <LuTextSelect size={14} />,
                label: '人工切片',
                disabledReason: asrDisabledReason,
                onNavigate: navigate,
              })}
              <Popconfirm
                title="确认删除该源视频？"
                description="删除后不可恢复，仅删除您自己的源视频数据。"
                okText="删除"
                cancelText="取消"
                okButtonProps={{ danger: true, loading: deletingId === record.id }}
                onConfirm={() => void handleDelete(record.id)}
              >
                <Button
                  type="link"
                  danger
                  className="list-page__action-btn"
                  icon={<LuTrash2 size={14} />}
                  loading={deletingId === record.id}
                >
                  删除
                </Button>
              </Popconfirm>
            </Space>
          );
        },
      },
    ],
    [deletingId, navigate, retryingAsrId]
  );

  const hasActiveAdvancedFilters = Boolean(dateRange?.[0] || appliedGlobalKeyword);

  const handleTableChange = (pagination: Parameters<typeof handleTablePaginationChange>[0]) => {
    handleTablePaginationChange(pagination, setPage, setPageSize, pageSize);
  };

  return (
    <ListPageLayout
      className="source-videos-page"
      title="源视频管理"
      description="管理直播源视频，支持添加、筛选、备注与删除。"
      toolbar={
        <ListSearchToolbar
          keyword={keyword}
          onKeywordChange={setKeyword}
          keywordPlaceholder="搜索源视频名称 / 备注名称（支持 关键词A+关键词B）"
          onSearch={applySearch}
          onRefresh={() => void loadList({ refresh: true })}
          refreshing={refreshing}
          hasActiveAdvancedFilters={hasActiveAdvancedFilters}
          extra={
            <Button type="primary" icon={<LuPlus size={16} />} onClick={() => setAddOpen(true)}>
              添加源视频
            </Button>
          }
          advanced={
            <>
              <div className="list-page__filter-field">
                <span className="list-page__filter-label">日期范围</span>
                <DatePicker.RangePicker
                  value={dateRange}
                  allowClear
                  placeholder={['开始日期', '结束日期']}
                  onChange={onDateChange}
                />
              </div>
              <div className="list-page__filter-field">
                <span className="list-page__filter-label">全局搜索</span>
                <Input
                  allowClear
                  placeholder="匹配所有文本字段"
                  value={globalKeyword}
                  onChange={(event) => setGlobalKeyword(event.target.value)}
                  onPressEnter={applySearch}
                />
              </div>
            </>
          }
        />
      }
    >
      <ListPageTable<SourceVideo>
        rowKey="id"
        loading={loading && list.length === 0}
        columns={columns}
        dataSource={list}
        scrollX={1200}
        pagination={{
          current: page,
          pageSize,
          total,
          ...DEFAULT_TABLE_PAGINATION,
        }}
        onChange={handleTableChange}
      />

      <AddSourceVideoModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSuccess={() => {
          if (page !== 1) {
            setPage(1);
          } else {
            void loadList();
          }
        }}
      />
    </ListPageLayout>
  );
};

export default SourceVideosPage;
