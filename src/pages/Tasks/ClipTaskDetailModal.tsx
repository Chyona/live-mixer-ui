import { Descriptions, Modal } from 'antd';
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

const ClipTaskDetailModal = ({ open, task, onClose }: ClipTaskDetailModalProps) => {
  if (!task) return null;

  const ext = parseClipTaskExt(task.ext);

  return (
    <Modal
      open={open}
      title="任务详情"
      width={640}
      footer={null}
      onCancel={onClose}
      className="tasks-detail-modal"
    >
      <Descriptions column={1} size="small" className="tasks-detail-descriptions">
        <Descriptions.Item label="任务类型">
          {getGenerationTaskTypeLabel(task.type)}
        </Descriptions.Item>
        <Descriptions.Item label="项目名称">{getClipTaskDisplayName(task)}</Descriptions.Item>
        <Descriptions.Item label="源视频名称">{task.live_name || '-'}</Descriptions.Item>
        {ext.target_duration_ms != null ? (
          <Descriptions.Item label="目标时长">
            {Math.round(ext.target_duration_ms / 1000)} 秒
          </Descriptions.Item>
        ) : null}
        <Descriptions.Item label="状态">{getClipTaskStatusLabel(task.status)}</Descriptions.Item>
        <Descriptions.Item label="进度">{task.progress}%</Descriptions.Item>
        <Descriptions.Item label="创建时间">{formatToDateTime(task.created_at)}</Descriptions.Item>
        {task.started_at ? (
          <Descriptions.Item label="开始时间">{formatToDateTime(task.started_at)}</Descriptions.Item>
        ) : null}
        {task.completed_at ? (
          <Descriptions.Item label="完成时间">{formatToDateTime(task.completed_at)}</Descriptions.Item>
        ) : null}
        {task.error_message ? (
          <Descriptions.Item label="错误信息">{task.error_message}</Descriptions.Item>
        ) : null}
      </Descriptions>
    </Modal>
  );
};

export default ClipTaskDetailModal;
