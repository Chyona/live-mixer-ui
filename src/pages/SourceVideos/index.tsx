import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, DatePicker, Input, Popconfirm, Space, Table, Tooltip } from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import type { Dayjs } from 'dayjs';
import { LuCirclePlay, LuPlus, LuSearch, LuTextSelect, LuTrash2 } from 'react-icons/lu';

import EllipsisTooltip from '~/components/EllipsisTooltip';
import RemarkEditor from '~/components/RemarkEditor';
import { useAppSEO } from '~/hooks/useAppSEO';
import { AppError } from '~/services/http';
import {
  deleteSourceVideo,
  fetchSourceVideoList,
  retrySourceVideoAsr,
  updateSourceVideoRemark,
  type SourceVideo,
} from '~/services/sourceVideo';
import { formatToDate } from '~/utils/date';
import { showAppError, toast } from '~/utils/toast';

import { buildDateRange, buildManualVideoSliceLink, buildSourceVideoSliceLink, formatVideoDuration } from './utils';
import AddSourceVideoModal from './AddSourceVideoModal';
import AsrProgressCell from './AsrProgressCell';
import { getAsrActionDisabledReason } from './asrUtils';
import './index.css';

function wrapAsrDisabledAction(content: ReactNode, disabledReason: string | null) {
  if (!disabledReason) return content;

  return (
    <Tooltip title={disabledReason}>
      <span className="source-videos-action-wrap">{content}</span>
    </Tooltip>
  );
}

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
      className="source-videos-action-btn"
      icon={options.icon}
      disabled={!!options.disabledReason}
      onClick={() => options.onNavigate(options.to)}
    >
      {options.label}
    </Button>
  );

  return wrapAsrDisabledAction(button, options.disabledReason);
}

const SourceVideosPage = () => {
  const navigate = useNavigate();

  useAppSEO({
    title: '源视频管理',
    path: '/source-videos',
    robots: 'noindex, nofollow',
  });

  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [keyword, setKeyword] = useState('');
  const [globalKeyword, setGlobalKeyword] = useState('');
  const [appliedKeyword, setAppliedKeyword] = useState('');
  const [appliedGlobalKeyword, setAppliedGlobalKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState<SourceVideo[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [retryingAsrId, setRetryingAsrId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const loadList = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setLoading(true);
    }

    try {
      const { date, dateEnd } = buildDateRange(dateRange);
      const response = await fetchSourceVideoList({
        date,
        dateEnd,
        keyword: appliedKeyword || undefined,
        globalKeyword: appliedGlobalKeyword || undefined,
        page,
        pageSize,
      });

      if (response.code !== 0) {
        if (!options?.silent) {
          toast.error(response.message || '加载源视频列表失败');
        }
        return;
      }

      setList(response.data.list);
      setTotal(response.data.total);
    } catch (error) {
      if (!options?.silent) {
        if (error instanceof AppError) {
          showAppError(error);
        } else {
          toast.error('加载源视频列表失败');
        }
      }
    } finally {
      if (!options?.silent) {
        setLoading(false);
      }
    }
  }, [appliedGlobalKeyword, appliedKeyword, dateRange, page, pageSize]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const hasProcessingAsr = useMemo(
    () => list.some((item) => item.asrStatus === 'pending' || item.asrStatus === 'processing'),
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
    setAppliedKeyword(keyword.trim());
    setAppliedGlobalKeyword(globalKeyword.trim());
    setPage(1);
  };

  const handleDateChange = (value: [Dayjs | null, Dayjs | null] | null) => {
    setDateRange(value);
    setPage(1);
  };

  const handleRemarkSave = async (id: string, remarkName: string) => {
    try {
      const response = await updateSourceVideoRemark(id, remarkName);
      if (response.code !== 0) {
        toast.error(response.message || '备注保存失败');
        return;
      }

      setList((prev) =>
        prev.map((item) => (item.id === id ? { ...item, remarkName: response.data.remarkName } : item))
      );
      toast.success('备注已保存');
    } catch (error) {
      if (error instanceof AppError) {
        showAppError(error);
      } else {
        toast.error('备注保存失败');
      }
    }
  };

  const handleRetryAsr = async (id: string) => {
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

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const response = await deleteSourceVideo(id);
      if (response.code !== 0) {
        toast.error(response.message || '删除失败');
        return;
      }

      toast.success('已删除源视频');
      if (list.length === 1 && page > 1) {
        setPage((prev) => prev - 1);
      } else {
        await loadList();
      }
    } catch (error) {
      if (error instanceof AppError) {
        showAppError(error);
      } else {
        toast.error('删除失败');
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
        render: (name: string) => <EllipsisTooltip text={name} className="source-videos-cell-ellipsis" />,
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
        dataIndex: 'remarkName',
        key: 'remarkName',
        render: (remarkName: string, record) => (
          <RemarkEditor value={remarkName} onSave={(value) => handleRemarkSave(record.id, value)} />
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
        dataIndex: 'date',
        key: 'date',
        width: 160,
        render: (date: string) => formatToDate(date),
      },
      {
        title: 'ASR解析进度',
        key: 'asrProgress',
        width: 160,
        render: (_, record) => (
          <AsrProgressCell
            status={record.asrStatus}
            progress={record.asrProgress}
            message={record.asrMessage}
            retrying={retryingAsrId === record.id}
            onRetry={
              record.asrStatus === 'failed'
                ? () => void handleRetryAsr(record.id)
                : undefined
            }
          />
        ),
      },
      {
        title: '切片数量',
        dataIndex: 'clipCount',
        key: 'clipCount',
        width: 100,
        align: 'center',
        render: (count: number, record) => (
          <Link className="source-videos-count-link" to={buildSourceVideoSliceLink(record.id)}>
            {count}
          </Link>
        ),
      },
      {
        title: '操作',
        key: 'actions',
        width: 240,
        fixed: 'right',
        render: (_, record) => {
          const asrDisabledReason = getAsrActionDisabledReason(record.asrStatus, record.asrMessage);

          return (
            <Space size={8}>
              {renderSliceAction({
                to: buildSourceVideoSliceLink(record.id),
                icon: <LuCirclePlay size={14} />,
                label: '进入',
                disabledReason: asrDisabledReason,
                onNavigate: navigate,
              })}
              {renderSliceAction({
                to: buildManualVideoSliceLink(record.id),
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
                  className="source-videos-action-btn"
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

  const handleTableChange = (pagination: TablePaginationConfig) => {
    if (pagination.current) {
      setPage(pagination.current);
    }
    if (pagination.pageSize) {
      setPageSize(pagination.pageSize);
    }
  };

  return (
    <div className="source-videos-page">
      <div className="source-videos-header">
        <div>
          <h1 className="source-videos-title">源视频管理</h1>
          <p className="source-videos-desc">管理直播源视频，支持添加、筛选、备注与删除。</p>
        </div>
        <Button type="primary" icon={<LuPlus size={16} />} onClick={() => setAddOpen(true)}>
          添加源视频
        </Button>
      </div>

      <div className="source-videos-toolbar">
        <div className="source-videos-toolbar-filters">
          <DatePicker.RangePicker
            className="source-videos-date-picker"
            value={dateRange}
            allowClear
            placeholder={['开始日期', '结束日期']}
            onChange={handleDateChange}
          />
          <Input
            className="source-videos-search-input"
            allowClear
            prefix={<LuSearch size={14} />}
            placeholder="标题搜索：源视频名称 / 备注名称（支持 关键词A+关键词B）"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            onPressEnter={applySearch}
          />
          <Input
            className="source-videos-search-input"
            allowClear
            prefix={<LuSearch size={14} />}
            placeholder="全局搜索：匹配所有文本字段"
            value={globalKeyword}
            onChange={(event) => setGlobalKeyword(event.target.value)}
            onPressEnter={applySearch}
          />
          <Button type="primary" onClick={applySearch}>
            搜索
          </Button>
        </div>
      </div>

      <Table<SourceVideo>
        className="source-videos-table"
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={list}
        scroll={{ x: 1320 }}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: (count) => `共 ${count} 条`,
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
    </div>
  );
};

export default SourceVideosPage;
