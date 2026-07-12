import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Popconfirm, Progress, Space, Table, Tag, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { LuCopy, LuDownload, LuEye, LuInfo, LuRefreshCw, LuTrash2 } from 'react-icons/lu';

import EllipsisTooltip from '~/components/EllipsisTooltip';
import RemarkEditor from '~/components/RemarkEditor';
import { AppError } from '~/services/http';
import {
  deleteClipTask,
  updateClipTaskName,
  type ClipTaskItem,
  type ClipTaskItemStatus,
} from '~/services/task';
import { formatToDateTime } from '~/utils/date';
import { showAppError, toast } from '~/utils/toast';

import ClipTaskDetailModal from './ClipTaskDetailModal';
import ClipPreviewModal from './ClipPreviewModal';
import { copyTextToClipboard, getClipTaskStatusLabel } from './utils';

interface ClipTaskListProps {
  tasks: ClipTaskItem[];
  onChanged: () => Promise<void>;
  onRefreshTask: (taskId: string) => Promise<void>;
}

function getStatusTagColor(status: ClipTaskItemStatus) {
  switch (status) {
    case 'success':
      return 'success';
    case 'failed':
      return 'error';
    case 'processing':
    case 'running':
      return 'processing';
    default:
      return 'default';
  }
}

function ClipTaskList({ tasks, onChanged, onRefreshTask }: ClipTaskListProps) {
  const [detailTask, setDetailTask] = useState<ClipTaskItem | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);

  const handleNameSave = useCallback(
    async (taskId: string, clipName: string) => {
      try {
        const response = await updateClipTaskName(taskId, clipName);
        if (response.code !== 0) {
          toast.notify.error(response.message || '成片名称保存失败');
          return;
        }
        await onChanged();
        toast.notify.success('成片名称已保存');
      } catch (error) {
        if (error instanceof AppError) {
          showAppError(error);
        } else {
          toast.notify.error('成片名称保存失败');
        }
      }
    },
    [onChanged]
  );

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

  const columns = useMemo<ColumnsType<ClipTaskItem>>(
    () => [
      {
        title: '成片名称',
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
        render: (status: ClipTaskItemStatus, record) => {
          const tag = <Tag color={getStatusTagColor(status)}>{getClipTaskStatusLabel(status)}</Tag>;
          if (status === 'failed' && record.message) {
            return <Tooltip title={record.message}>{tag}</Tooltip>;
          }
          return tag;
        },
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
        width: 300,
        render: (_, record) => {
          const videoUrl = record.videoUrls[0];
          const draftUrl = record.draftUrls[0];

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
                  icon={<LuEye size={14} />}
                  disabled={!videoUrl}
                  onClick={() => setPreviewUrl(videoUrl ?? null)}
                >
                  成片预览
                </Button>
                <Button
                  type="link"
                  size="small"
                  icon={<LuDownload size={14} />}
                  disabled={!videoUrl}
                  href={videoUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  下载成片
                </Button>
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
    [deletingId, handleCopyDraft, handleDelete, handleNameSave, handleRefresh, refreshingId]
  );

  if (!tasks.length) {
    return <div className="tasks-empty">暂无剪辑任务，请从源视频管理进入切片页提交任务。</div>;
  }

  return (
    <>
      <Table
        className="tasks-table"
        rowKey="taskId"
        columns={columns}
        dataSource={tasks}
        pagination={false}
        scroll={{ x: 1100 }}
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
