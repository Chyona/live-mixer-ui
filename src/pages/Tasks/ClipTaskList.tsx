import { useCallback, useMemo, useState } from 'react';
import { Button, Popconfirm, Progress, Space, Table } from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { LuCopy, LuInfo, LuRefreshCw, LuTrash2 } from 'react-icons/lu';

import EllipsisTooltip from '~/components/EllipsisTooltip';
import ListTableEmpty, { type ListTableEmptyProps } from '~/components/ListTableEmpty';
import { AppError } from '~/services/http';
import {
  deleteClipTask,
  type ClipTaskItem,
  type ClipTaskItemStatus,
  type GenerationTaskType,
} from '~/services/task';
import { formatToDateTime } from '~/utils/date';
import { showAppError, toast } from '~/utils/toast';

import ClipTaskDetailModal from './ClipTaskDetailModal';
import {
  copyTextToClipboard,
  getClipTaskDisplayName,
  getClipTaskStatusLabel,
  getGenerationTaskTypeLabel,
} from './utils';

interface ClipTaskListProps {
  tasks: ClipTaskItem[];
  total: number;
  scrollY?: number;
  pagination: TablePaginationConfig | false;
  onTableChange: (pagination: TablePaginationConfig) => void;
  onChanged: () => Promise<void>;
  onRefreshTask: (taskId: string | number) => Promise<void>;
  empty?: ListTableEmptyProps;
}

function canCopyDraft(taskType: GenerationTaskType) {
  return taskType === 'draft' || taskType === 'ai_slice_draft';
}

function renderTaskTypeLabel(taskType: GenerationTaskType) {
  const type = taskType || 'draft';

  return (
    <span className={`tasks-type-label tasks-type-label_${type}`}>
      {getGenerationTaskTypeLabel(type)}
    </span>
  );
}

function renderStatusLabel(status: ClipTaskItemStatus) {
  return (
    <span className={`tasks-status tasks-status_${status}`}>
      <span className="tasks-status-dot" aria-hidden />
      {getClipTaskStatusLabel(status)}
    </span>
  );
}

function renderProgress(progress: number, status: ClipTaskItemStatus) {
  const percent = Math.max(0, Math.min(100, Math.round(progress)));
  const isCompleted = status === 'completed';

  return (
    <Progress
      className="tasks-progress-bar"
      percent={isCompleted ? 100 : percent}
      size="small"
      status={isCompleted ? 'success' : 'normal'}
      format={(value) => (isCompleted ? undefined : `${value}%`)}
    />
  );
}

function ClipTaskList({
  tasks,
  total,
  scrollY,
  pagination,
  onTableChange,
  onChanged,
  onRefreshTask,
  empty,
}: ClipTaskListProps) {
  const [detailTask, setDetailTask] = useState<ClipTaskItem | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [refreshingId, setRefreshingId] = useState<number | null>(null);

  const handleDelete = useCallback(
    async (taskId: number) => {
      setDeletingId(taskId);
      try {
        const response = await deleteClipTask(taskId);
        if (response.code !== 0) {
          toast.notify.error(response.message || '删除失败');
          return;
        }
        await onChanged();
        toast.notify.success('任务已删除');
      } catch (error) {
        if (error instanceof AppError) {
          showAppError(error);
        } else {
          toast.notify.error('删除失败');
        }
      } finally {
        setDeletingId(null);
      }
    },
    [onChanged]
  );

  const handleRefresh = useCallback(
    async (taskId: number) => {
      setRefreshingId(taskId);
      try {
        await onRefreshTask(taskId);
      } finally {
        setRefreshingId(null);
      }
    },
    [onRefreshTask]
  );

  const handleCopyDraft = useCallback(async (url: string) => {
    const draftUrl = url.trim();
    if (!draftUrl) {
      toast.notify.warning('暂无草稿地址');
      return;
    }
    const copied = await copyTextToClipboard(draftUrl);
    if (copied) {
      toast.notify.success('草稿地址已复制', '请打开「剪映小助手」粘贴导入');
      return;
    }
    toast.notify.error('复制失败，请手动复制链接');
  }, []);

  const columns = useMemo<ColumnsType<ClipTaskItem>>(
    () => [
      {
        title: '任务类型',
        dataIndex: 'type',
        key: 'type',
        width: 120,
        render: (taskType: GenerationTaskType) => renderTaskTypeLabel(taskType),
      },
      {
        title: '项目名称',
        dataIndex: 'video_project_name',
        key: 'video_project_name',
        ellipsis: true,
        render: (_, record) => (
          <EllipsisTooltip text={getClipTaskDisplayName(record)} className="tasks-cell-ellipsis" />
        ),
      },
      {
        title: '进度',
        dataIndex: 'progress',
        key: 'progress',
        width: 180,
        render: (progress: number, record) => renderProgress(progress, record.status),
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        width: 100,
        render: (status: ClipTaskItemStatus) => renderStatusLabel(status),
      },
      {
        title: '错误信息',
        dataIndex: 'error_message',
        key: 'error_message',
        width: 220,
        ellipsis: true,
        render: (message: string) => {
          const text = message?.trim();
          if (!text) return <span className="tasks-error-empty">-</span>;
          return (
            <EllipsisTooltip text={text} className="tasks-error-message tasks-cell-ellipsis" />
          );
        },
      },
      {
        title: '创建时间',
        dataIndex: 'created_at',
        key: 'created_at',
        width: 160,
        render: (value: string) => formatToDateTime(value),
      },
      {
        title: '操作',
        key: 'actions',
        width: 245,
        render: (_, record) => {
          const showCopyDraft = canCopyDraft(record.type);
          const draftUrl = record.draft_url?.trim() || '';

          return (
            <div className="tasks-actions">
              <Space size={0} className="tasks-actions-row" wrap>
                <Button
                  type="link"
                  size="small"
                  icon={<LuRefreshCw size={14} />}
                  loading={refreshingId === record.id}
                  onClick={() => void handleRefresh(record.id)}
                >
                  同步状态
                </Button>
                <Button
                  type="link"
                  size="small"
                  icon={<LuInfo size={14} />}
                  onClick={() => setDetailTask(record)}
                >
                  详情
                </Button>
                <Popconfirm
                  title="确定删除该任务吗？"
                  okText="删除"
                  cancelText="取消"
                  onConfirm={() => void handleDelete(record.id)}
                >
                  <Button
                    type="link"
                    size="small"
                    danger
                    icon={<LuTrash2 size={14} />}
                    loading={deletingId === record.id}
                  >
                    删除
                  </Button>
                </Popconfirm>
              </Space>
              {showCopyDraft ? (
                <div className="tasks-actions-row">
                  <Button
                    type="link"
                    size="small"
                    icon={<LuCopy size={14} />}
                    disabled={!draftUrl}
                    onClick={() => void handleCopyDraft(draftUrl)}
                  >
                    复制草稿地址
                  </Button>
                </div>
              ) : null}
            </div>
          );
        },
      },
    ],
    [deletingId, handleCopyDraft, handleDelete, handleRefresh, refreshingId]
  );

  return (
    <>
      <Table
        className="list-page__table tasks-table"
        rowKey="id"
        columns={columns}
        dataSource={tasks}
        pagination={pagination}
        locale={{ emptyText: <ListTableEmpty {...empty} /> }}
        onChange={(nextPagination) => onTableChange(nextPagination)}
        scroll={scrollY !== undefined ? { y: scrollY } : undefined}
      />

      <ClipTaskDetailModal open={Boolean(detailTask)} task={detailTask} onClose={() => setDetailTask(null)} />
    </>
  );
}

export default ClipTaskList;
