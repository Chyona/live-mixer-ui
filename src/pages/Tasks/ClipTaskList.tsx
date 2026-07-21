import { useCallback, useMemo, useState } from 'react';
import { Button, Popconfirm, Space } from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { LuCopy, LuFileText, LuTrash2 } from 'react-icons/lu';

import AiPromptPreviewDrawer from '~/components/AiPromptPreviewDrawer';
import PromptContentCell from '~/components/AiPromptPreviewDrawer/PromptContentCell';
import EllipsisTooltip from '~/components/EllipsisTooltip';
import ListPageTable from '~/components/ListPageTable';
import type { ListTableEmptyProps } from '~/components/ListTableEmpty';
import type { AiPrompt } from '~/services/aiPrompt';
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
import TaskProgressCell from './TaskProgressCell';
import {
  copyTextToClipboard,
  getClipTaskDisplayName,
  getClipTaskStatusLabel,
  getGenerationTaskTypeLabel,
} from './utils';

function buildPromptPreview(name: string, content: string): AiPrompt {
  return {
    id: 0,
    name,
    content,
    remark: '',
    created_by: '',
    created_at: '',
    updated_at: '',
    is_editable: 0,
  };
}

interface ClipTaskListProps {
  tasks: ClipTaskItem[];
  loading?: boolean;
  pagination: TablePaginationConfig | false;
  onTableChange: (pagination: TablePaginationConfig) => void;
  onChanged: () => Promise<void>;
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

function ClipTaskList({
  tasks,
  loading = false,
  pagination,
  onTableChange,
  onChanged,
  empty,
}: ClipTaskListProps) {
  const [detailTask, setDetailTask] = useState<ClipTaskItem | null>(null);
  const [previewPrompt, setPreviewPrompt] = useState<AiPrompt | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const openPromptPreview = useCallback((name: string, content: string) => {
    const text = content.trim();
    if (!text) return;
    setPreviewPrompt(buildPromptPreview(name, text));
  }, []);

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
        width: 230,
        ellipsis: true,
        render: (_, record) => (
          <EllipsisTooltip text={getClipTaskDisplayName(record)} className="tasks-cell-ellipsis" />
        ),
      },
      {
        title: '系统提示词',
        dataIndex: 'sys_prompt',
        key: 'sys_prompt',
        ellipsis: true,
        render: (value: string) => {
          const text = value?.trim() || '';
          if (!text) return <span className="tasks-error-empty">-</span>;
          return (
            <PromptContentCell
              content={text}
              onView={() => openPromptPreview('系统提示词', text)}
            />
          );
        },
      },
      {
        title: '用户提示词',
        dataIndex: 'usr_prompt',
        key: 'usr_prompt',
        ellipsis: true,
        render: (value: string) => {
          const text = value?.trim() || '';
          if (!text) return <span className="tasks-error-empty">-</span>;
          return (
            <PromptContentCell
              content={text}
              onView={() => openPromptPreview('用户提示词', text)}
            />
          );
        },
      },
      {
        title: '进度',
        dataIndex: 'progress',
        key: 'progress',
        width: 160,
        render: (progress: number, record) => (
          <TaskProgressCell
            progress={progress}
            status={record.status}
            errorMessage={record.error_message}
          />
        ),
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
        width: 180,
        fixed: 'right',
        render: (_, record) => {
          const showCopyDraft = canCopyDraft(record.type);
          const draftUrl = record.draft_url?.trim() || '';
          return (
            <Space size={8} wrap>
              <Button
                type="link"
                size="small"
                className="list-page__action-btn"
                icon={<LuFileText size={14} />}
                onClick={() => setDetailTask(record)}
              >
                详情
              </Button>
              {/* <Popconfirm
                title="确定删除该任务吗？"
                okText="删除"
                cancelText="取消"
                okButtonProps={{ danger: true, loading: deletingId === record.id }}
                onConfirm={() => void handleDelete(record.id)}
              >
                <Button
                  type="link"
                  size="small"
                  danger
                  className="list-page__action-btn"
                  icon={<LuTrash2 size={14} />}
                  loading={deletingId === record.id}
                >
                  删除
                </Button>
              </Popconfirm> */}
              {showCopyDraft ? (
                <Button
                  type="link"
                  size="small"
                  className="list-page__action-btn"
                  icon={<LuCopy size={14} />}
                  disabled={!draftUrl}
                  onClick={() => void handleCopyDraft(draftUrl)}
                >
                  草稿地址
                </Button>
              ) : null}
            </Space>
          );
        },
      },
    ],
    [deletingId, handleCopyDraft, handleDelete, openPromptPreview]
  );

  return (
    <>
      <ListPageTable<ClipTaskItem>
        className="tasks-table"
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={tasks}
        scrollX={1600}
        empty={empty}
        pagination={pagination}
        onChange={(nextPagination) => onTableChange(nextPagination)}
      />

      <ClipTaskDetailModal open={Boolean(detailTask)} task={detailTask} onClose={() => setDetailTask(null)} />

      <AiPromptPreviewDrawer
        open={Boolean(previewPrompt)}
        prompt={previewPrompt}
        onClose={() => setPreviewPrompt(null)}
        showFooter={false}
      />
    </>
  );
}

export default ClipTaskList;
