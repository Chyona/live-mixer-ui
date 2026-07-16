import { Descriptions, Drawer, Progress, Typography } from 'antd';
import { LuX } from 'react-icons/lu';

import type { ClipTaskItem } from '~/services/task';
import { parseClipTaskExt } from '~/services/task';
import { formatToDateTime } from '~/utils/date';
import {
  getClipTaskDisplayName,
  getClipTaskStatusLabel,
  getGenerationTaskTypeLabel,
} from './utils';

interface ClipTaskDetailModalProps {
  open: boolean;
  task: ClipTaskItem | null;
  onClose: () => void;
}

function canShowDraft(taskType: ClipTaskItem['type']) {
  return taskType === 'draft' || taskType === 'ai_slice_draft';
}

const ClipTaskDetailModal = ({ open, task, onClose }: ClipTaskDetailModalProps) => {
  const ext = task ? parseClipTaskExt(task.ext) : null;
  const draftUrl = task?.draft_url?.trim() || '';
  const errorMessage = task?.error_message?.trim() || '';
  const percent = task ? Math.max(0, Math.min(100, Math.round(task.progress))) : 0;
  const isCompleted = task?.status === 'completed';
  const isFailed = task?.status === 'failed';
  const typeClass = `tasks-type-label tasks-type-label_${task?.type || 'draft'}`;
  const progressStatus = isCompleted ? 'success' : isFailed ? 'exception' : 'normal';

  return (
    <Drawer
      className="tasks-detail-drawer"
      title={null}
      placement="right"
      width="min(440px, 100vw)"
      open={open}
      onClose={onClose}
      closable={false}
      destroyOnClose
    >
      {task ? (
        <div className="tasks-detail-drawer__layout">
          <header className="tasks-detail-drawer__header">
            <div className="tasks-detail-drawer__header-main">
              <h3 className="tasks-detail-drawer__title">{getClipTaskDisplayName(task)}</h3>
              <p className="tasks-detail-drawer__meta">
                <span className={typeClass}>{getGenerationTaskTypeLabel(task.type)}</span>
                <span className="tasks-detail-drawer__meta-sep">·</span>
                <span className={`tasks-status tasks-status_${task.status}`}>
                  <span className="tasks-status-dot" aria-hidden />
                  {getClipTaskStatusLabel(task.status)}
                </span>
              </p>
            </div>
            <button
              type="button"
              className="tasks-detail-drawer__close"
              aria-label="关闭"
              onClick={onClose}
            >
              <LuX size={18} />
            </button>
          </header>

          <div className="tasks-detail-drawer__body">
            <Descriptions column={1} size="small" className="tasks-detail-descriptions">
              {ext?.target_duration_ms != null ? (
                <Descriptions.Item label="目标时长">
                  {Math.round(ext.target_duration_ms / 1000)} 秒
                </Descriptions.Item>
              ) : null}
              {errorMessage ? (
                <Descriptions.Item label="失败原因">
                  <p className="tasks-detail-error">{errorMessage}</p>
                </Descriptions.Item>
              ) : null}
              <Descriptions.Item label="进度">
                <Progress
                  className="tasks-progress-bar tasks-detail-progress"
                  percent={isCompleted ? 100 : percent}
                  size="small"
                  status={progressStatus}
                  {...(isCompleted ? {} : { format: (value?: number) => `${value ?? 0}%` })}
                />
              </Descriptions.Item>
              {canShowDraft(task.type) ? (
                <Descriptions.Item label="草稿地址">
                  {draftUrl ? (
                    <Typography.Paragraph
                      className="tasks-detail-draft"
                      copyable={{ text: draftUrl }}
                    >
                      {draftUrl}
                    </Typography.Paragraph>
                  ) : (
                    <span className="tasks-error-empty">暂无草稿地址</span>
                  )}
                </Descriptions.Item>
              ) : null}
              <Descriptions.Item label="创建时间">{formatToDateTime(task.created_at)}</Descriptions.Item>
              {task.started_at ? (
                <Descriptions.Item label="开始时间">{formatToDateTime(task.started_at)}</Descriptions.Item>
              ) : null}
              {task.completed_at ? (
                <Descriptions.Item label="完成时间">{formatToDateTime(task.completed_at)}</Descriptions.Item>
              ) : null}
            </Descriptions>
          </div>
        </div>
      ) : null}
    </Drawer>
  );
};

export default ClipTaskDetailModal;
