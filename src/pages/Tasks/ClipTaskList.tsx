import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Popconfirm, Progress, Space, Table, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { LuCopy, LuDownload, LuEye, LuInfo, LuRefreshCw, LuTextSelect, LuTrash2 } from 'react-icons/lu';

import EllipsisTooltip from '~/components/EllipsisTooltip';
import { AppError } from '~/services/http';
import {
  deleteClipTask,
  type ClipTaskItem,
  type ClipTaskItemStatus,
  type GenerationTaskType,
} from '~/services/task';
import { formatToDateTime } from '~/utils/date';
import { showAppError, toast } from '~/utils/toast';
import { buildManualVideoSliceLink } from '~/routes/links';

import ClipTaskDetailModal from './ClipTaskDetailModal';
import ClipPreviewModal from './ClipPreviewModal';
import { copyTextToClipboard, getClipTaskStatusLabel, getGenerationTaskTypeLabel } from './utils';

interface ClipTaskListProps {
  tasks: ClipTaskItem[];
  scrollY?: number;
  onChanged: () => Promise<void>;
  onRefreshTask: (taskId: string) => Promise<void>;
}

function renderTaskTypeLabel(taskType: GenerationTaskType) {
  const type = taskType ?? 'clip_generate';

  return (
    <span className={`tasks-type-label tasks-type-label_${type}`}>
      {getGenerationTaskTypeLabel(type)}
    </span>
  );
}

function renderStatusLabel(status: ClipTaskItemStatus, message?: string | null) {
  const label = (
    <span className={`tasks-status tasks-status_${status}`}>
      <span className="tasks-status-dot" aria-hidden />
      {getClipTaskStatusLabel(status)}
    </span>
  );

  if (status === 'failed' && message) {
    return <Tooltip title={message}>{label}</Tooltip>;
  }

  return label;
}

function ClipTaskList({ tasks, scrollY, onChanged, onRefreshTask }: ClipTaskListProps) {
  const navigate = useNavigate();
  const [detailTask, setDetailTask] = useState<ClipTaskItem | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);

  const handleDelete = useCallback(
    async (taskId: string) => {
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

  const handleCopyDraft = useCallback(async (url: string) => {
    const copied = await copyTextToClipboard(url);
    if (copied) {
      toast.notify.success('草稿地址已复制', '请打开「剪映小助手」粘贴导入');
      return;
    }
    toast.notify.error('复制失败，请手动复制链接');
  }, []);

  const handleRefresh = useCallback(
    async (taskId: string) => {
      setRefreshingId(taskId);
      try {
        await onRefreshTask(taskId);
      } finally {
        setRefreshingId(null);
      }
    },
    [onRefreshTask]
  );

  const handleViewAiResult = useCallback(
    (record: ClipTaskItem) => {
      if (!record.aiSegments?.length) {
        toast.notify.warning('暂无可用的选片结果');
        return;
      }

      navigate(buildManualVideoSliceLink(record.sourceVideoId), {
        state: { from: 'tasks', aiSelectedSegments: record.aiSegments },
      });
    },
    [navigate]
  );

  const columns = useMemo<ColumnsType<ClipTaskItem>>(
    () => [
      {
        title: '任务类型',
        dataIndex: 'taskType',
        key: 'taskType',
        width: 110,
        render: (taskType: GenerationTaskType) => renderTaskTypeLabel(taskType),
      },
      {
        title: '任务名称',
        dataIndex: 'clipName',
        key: 'clipName',
        render: (name: string) => <EllipsisTooltip text={name || '-'} className="tasks-cell-ellipsis" />,
      },
      {
        title: '源视频名称',
        dataIndex: 'sourceVideoName',
        key: 'sourceVideoName',
        render: (name: string) => <EllipsisTooltip text={name || '-'} className="tasks-cell-ellipsis" />,
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        width: 110,
        render: (status: ClipTaskItemStatus, record) => renderStatusLabel(status, record.message),
      },
      {
        title: '进度',
        dataIndex: 'progress',
        key: 'progress',
        width: 160,
        render: (progress: number, record) => (
          <Progress
            percent={progress}
            size="small"
            status={record.status === 'failed' ? 'exception' : record.status === 'success' ? 'success' : 'active'}
          />
        ),
      },
      {
        title: '创建时间',
        dataIndex: 'createdAt',
        key: 'createdAt',
        width: 160,
        render: (value: string) => formatToDateTime(value),
      },
      {
        title: '操作',
        key: 'actions',
        fixed: 'right',
        width: 280,
        render: (_, record) => {
          const isAiTask = record.taskType === 'ai_slice_select';
          const videoUrl = record.videoUrls[0];
          const draftUrl = record.draftUrls[0];
          const canViewAiResult = isAiTask && record.status === 'success' && Boolean(record.aiSegments?.length);

          return (
            <div className="tasks-actions">
              <Space size={4} className="tasks-actions-row">
                <Button type="link" size="small" icon={<LuInfo size={14} />} onClick={() => setDetailTask(record)}>
                  任务详情
                </Button>
                <Button
                  type="link"
                  size="small"
                  icon={<LuRefreshCw size={14} />}
                  loading={refreshingId === record.taskId}
                  onClick={() => void handleRefresh(record.taskId)}
                >
                  同步状态
                </Button>
                <Popconfirm
                  title="确定删除该任务吗？"
                  okText="删除"
                  cancelText="取消"
                  onConfirm={() => void handleDelete(record.taskId)}
                >
                  <Button
                    type="link"
                    size="small"
                    danger
                    icon={<LuTrash2 size={14} />}
                    loading={deletingId === record.taskId}
                  >
                    删除
                  </Button>
                </Popconfirm>
              </Space>
              <Space size={4} className="tasks-actions-row">
                <Button
                  type="link"
                  size="small"
                  icon={<LuCopy size={14} />}
                  disabled={!draftUrl}
                  onClick={() => draftUrl && void handleCopyDraft(draftUrl)}
                >
                  复制草稿地址
                </Button>
              </Space>
            </div>
          );
        },
      },
    ],
    [deletingId, handleCopyDraft, handleDelete, handleRefresh, handleViewAiResult, refreshingId]
  );

  if (!tasks.length) {
    return (
      <div className="tasks-empty">
        暂无生成任务，请从源视频切片页提交「一键成片」或「AI 选片」任务。
      </div>
    );
  }

  return (
    <>
      <Table
        className="list-page__table tasks-table"
        rowKey="taskId"
        columns={columns}
        dataSource={tasks}
        pagination={false}
        scroll={{ x: 1200, y: scrollY }}
      />

      <ClipTaskDetailModal open={Boolean(detailTask)} task={detailTask} onClose={() => setDetailTask(null)} />

      <ClipPreviewModal
        open={Boolean(previewUrl)}
        url={previewUrl}
        onClose={() => setPreviewUrl(null)}
      />
    </>
  );
}

export default ClipTaskList;
