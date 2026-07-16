import { Descriptions, Modal, Progress, Typography } from 'antd';
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
  if (!task) return null;

  const ext = parseClipTaskExt(task.ext);
  const draftUrl = task.draft_url?.trim() || '';
  const errorMessage = task.error_message?.trim() || '';
  const percent = Math.max(0, Math.min(100, Math.round(task.progress)));
  const isCompleted = task.status === 'completed';
  const typeClass = `tasks-type-label tasks-type-label_${task.type || 'draft'}`;

  return (
    <Modal
      open={open}
      title="任务详情"
      width={640}
      footer={null}
      onCancel={onClose}
      className="tasks-detail-modal noanimation-modal"
    >
      <Descriptions column={1} size="small" className="tasks-detail-descriptions">
        <Descriptions.Item label="任务类型">
          <span className={typeClass}>{getGenerationTaskTypeLabel(task.type)}</span>
        </Descriptions.Item>
        <Descriptions.Item label="项目名称">{getClipTaskDisplayName(task)}</Descriptions.Item>
        {ext.target_duration_ms != null ? (
          <Descriptions.Item label="目标时长">
            {Math.round(ext.target_duration_ms / 1000)} 秒
          </Descriptions.Item>
        ) : null}
        <Descriptions.Item label="状态">
          <div className="tasks-detail-status-block">
            <span className={`tasks-status tasks-status_${task.status}`}>
              <span className="tasks-status-dot" aria-hidden />
              {getClipTaskStatusLabel(task.status)}
            </span>
            {errorMessage ? (
              <p className="tasks-detail-error">{errorMessage}</p>
            ) : null}
          </div>
        </Descriptions.Item>
        <Descriptions.Item label="进度">
          <Progress
            className="tasks-progress-bar tasks-detail-progress"
            percent={isCompleted ? 100 : percent}
            size="small"
            status={isCompleted ? 'success' : 'normal'}
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
    </Modal>
  );
};

export default ClipTaskDetailModal;
