import { Descriptions, Modal } from 'antd';
import type { ClipTaskItem } from '~/services/task';
import { formatToDateTime } from '~/utils/date';
import { getClipTaskStatusLabel } from './utils';

interface ClipTaskDetailModalProps {
  open: boolean;
  task: ClipTaskItem | null;
  onClose: () => void;
}

const ClipTaskDetailModal = ({ open, task, onClose }: ClipTaskDetailModalProps) => {
  if (!task) return null;

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
        <Descriptions.Item label="任务 ID">{task.taskId}</Descriptions.Item>
        <Descriptions.Item label="成片名称">{task.clipName}</Descriptions.Item>
        <Descriptions.Item label="源视频名称">{task.sourceVideoName || '-'}</Descriptions.Item>
        <Descriptions.Item label="源视频地址">
          <a href={task.m3u8Url} target="_blank" rel="noreferrer" className="tasks-detail-link">
            {task.m3u8Url}
          </a>
        </Descriptions.Item>
        <Descriptions.Item label="状态">{getClipTaskStatusLabel(task.status)}</Descriptions.Item>
        <Descriptions.Item label="进度">{task.progress}%</Descriptions.Item>
        <Descriptions.Item label="创建时间">{formatToDateTime(task.createdAt)}</Descriptions.Item>
        {task.message && <Descriptions.Item label="错误信息">{task.message}</Descriptions.Item>}
        {task.videoUrls.length > 0 && (
          <Descriptions.Item label="成片地址">
            {task.videoUrls.map((url) => (
              <div key={url}>
                <a href={url} target="_blank" rel="noreferrer" className="tasks-detail-link">
                  {url}
                </a>
              </div>
            ))}
          </Descriptions.Item>
        )}
        {task.draftUrls.length > 0 && (
          <Descriptions.Item label="草稿地址">
            {task.draftUrls.map((url) => (
              <div key={url}>
                <a href={url} target="_blank" rel="noreferrer" className="tasks-detail-link">
                  {url}
                </a>
              </div>
            ))}
          </Descriptions.Item>
        )}
      </Descriptions>
    </Modal>
  );
};

export default ClipTaskDetailModal;
