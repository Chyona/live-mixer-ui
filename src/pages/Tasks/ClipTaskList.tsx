import { useCallback, useMemo, useState } from 'react';
import { Button, Space } from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { LuCopy, LuFileText } from 'react-icons/lu';

import EllipsisTooltip from '~/components/EllipsisTooltip';
import ListPageTable from '~/components/ListPageTable';
import type { ListTableEmptyProps } from '~/components/ListTableEmpty';
import type { ClipTaskItem, GenerationTaskType } from '~/services/task';
import { formatToDateTime } from '~/utils/date';
import { toast } from '~/utils/toast';

import ClipTaskDetailModal from './ClipTaskDetailModal';
import TaskProgressCell from './TaskProgressCell';
import {
  copyTextToClipboard,
  getClipTaskDisplayName,
  getClipTaskLiveName,
  getGenerationTaskTypeLabel,
} from './utils';

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

function ClipTaskList({
  tasks,
  loading = false,
  pagination,
  onTableChange,
  empty,
}: ClipTaskListProps) {
  const [detailTask, setDetailTask] = useState<ClipTaskItem | null>(null);

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
        title: '源视频名称',
        dataIndex: 'live_name',
        key: 'live_name',
        ellipsis: true,
        render: (_, record) => {
          const name = getClipTaskLiveName(record);
          if (!name) return <span className="tasks-error-empty">-</span>;
          return <EllipsisTooltip text={name} className="tasks-cell-ellipsis" />;
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
        title: '创建者',
        dataIndex: 'created_by',
        key: 'created_by',
        width: 120,
        ellipsis: true,
        render: (value: string) => {
          const name = value?.trim() || '';
          if (!name) return <span className="tasks-error-empty">-</span>;
          return <EllipsisTooltip text={name} className="tasks-cell-ellipsis" />;
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
    [handleCopyDraft]
  );

  return (
    <>
      <ListPageTable<ClipTaskItem>
        className="tasks-table"
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={tasks}
        scrollX={1220}
        empty={empty}
        pagination={pagination}
        onChange={(nextPagination) => onTableChange(nextPagination)}
      />

      <ClipTaskDetailModal open={Boolean(detailTask)} task={detailTask} onClose={() => setDetailTask(null)} />
    </>
  );
}

export default ClipTaskList;
