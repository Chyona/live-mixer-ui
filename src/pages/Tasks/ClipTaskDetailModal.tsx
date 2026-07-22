import { Descriptions, Drawer, Progress, Typography } from 'antd';
import { LuX } from 'react-icons/lu';

import type { ClipTaskItem } from '~/services/task';
import { formatToDateTime } from '~/utils/date';
import {
  getClipTaskAspectRatio,
  getClipTaskDisplayName,
  getClipTaskStatusLabel,
  getGenerationTaskTypeLabel,
} from './utils';

interface ClipTaskDetailModalProps {
  open: boolean;
  task: ClipTaskItem | null;
  onClose: () => void;
}

function EmptyValue() {
  return <span className="tasks-error-empty">-</span>;
}

function isHttpUrl(url: string) {
  return /^https?:\/\//i.test(url);
}

function CopyableUrl({ url, linkable = false }: { url: string; linkable?: boolean }) {
  const text = url.trim();
  if (!text) return <EmptyValue />;

  const content =
    linkable && isHttpUrl(text) ? (
      <a
        className="tasks-detail-link"
        href={text}
        target="_blank"
        rel="noopener noreferrer"
      >
        {text}
      </a>
    ) : (
      text
    );

  return (
    <Typography.Paragraph className="tasks-detail-draft" copyable={{ text }}>
      {content}
    </Typography.Paragraph>
  );
}

const ClipTaskDetailModal = ({ open, task, onClose }: ClipTaskDetailModalProps) => {
  const draftUrl = task?.draft_url?.trim() || '';
  const liveUrl = task?.live_url?.trim() || '';
  const errorMessage = task?.error_message?.trim() || '';
  const projectName = task ? getClipTaskDisplayName(task) : '';
  const aspectRatio = task ? getClipTaskAspectRatio(task) : '-';
  const percent = task ? Math.max(0, Math.min(100, Math.round(task.progress))) : 0;
  const isCompleted = task?.status === 'completed';
  const isFailed = task?.status === 'failed';
  const progressStatus = isCompleted ? 'success' : isFailed ? 'exception' : 'normal';

  return (
    <Drawer
      className="tasks-detail-drawer"
      title={null}
      placement="right"
      width="min(480px, 100vw)"
      open={open}
      onClose={onClose}
      closable={false}
      destroyOnClose
    >
      {task ? (
        <div className="tasks-detail-drawer__layout">
          <header className="tasks-detail-drawer__header">
            <div className="tasks-detail-drawer__header-main">
              <h3 className="tasks-detail-drawer__title">任务详情</h3>
              <p className="tasks-detail-drawer__meta">
                <span className={`tasks-type-label tasks-type-label_${task.type || 'draft'}`}>
                  {getGenerationTaskTypeLabel(task.type)}
                </span>
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
              <Descriptions.Item label="任务ID">
                {task.id.trim() ? task.id : <EmptyValue />}
              </Descriptions.Item>
              <Descriptions.Item label="项目名称">
                {projectName || <EmptyValue />}
              </Descriptions.Item>
              <Descriptions.Item label="视频比例">
                {aspectRatio === '-' ? <EmptyValue /> : aspectRatio}
              </Descriptions.Item>
              <Descriptions.Item label="任务类型">
                <span className={`tasks-type-label tasks-type-label_${task.type || 'draft'}`}>
                  {getGenerationTaskTypeLabel(task.type)}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="任务创建者">
                {task.created_by?.trim() || <EmptyValue />}
              </Descriptions.Item>
              <Descriptions.Item label="任务创建时间">
                {formatToDateTime(task.created_at)}
              </Descriptions.Item>
              <Descriptions.Item label="任务更新时间">
                {formatToDateTime(task.updated_at)}
              </Descriptions.Item>
              <Descriptions.Item label="任务开始时间">
                {formatToDateTime(task.started_at)}
              </Descriptions.Item>
              <Descriptions.Item label="任务完成时间">
                {formatToDateTime(task.completed_at)}
              </Descriptions.Item>
              <Descriptions.Item label="任务状态">
                <span className={`tasks-status tasks-status_${task.status}`}>
                  <span className="tasks-status-dot" aria-hidden />
                  {getClipTaskStatusLabel(task.status)}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="任务进度">
                <Progress
                  className="tasks-progress-bar tasks-detail-progress"
                  percent={isCompleted ? 100 : percent}
                  size="small"
                  status={progressStatus}
                  {...(isCompleted ? {} : { format: (value?: number) => `${value ?? 0}%` })}
                />
              </Descriptions.Item>
              <Descriptions.Item label="错误信息">
                {errorMessage ? (
                  <p className="tasks-detail-error">{errorMessage}</p>
                ) : (
                  <EmptyValue />
                )}
              </Descriptions.Item>
              <Descriptions.Item label="直播素材URL">
                <CopyableUrl url={liveUrl} />
              </Descriptions.Item>
              <Descriptions.Item label="草稿地址">
                <CopyableUrl url={draftUrl} />
              </Descriptions.Item>
            </Descriptions>
          </div>
        </div>
      ) : null}
    </Drawer>
  );
};

export default ClipTaskDetailModal;
