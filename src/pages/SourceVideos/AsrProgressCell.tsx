import { Button, Progress, Spin, Tooltip } from 'antd';
import { LuRotateCw } from 'react-icons/lu';

import type { AsrStatus } from '~/services/sourceVideo';

import { ASR_STATUS_LABEL } from './asrUtils';

function getProgressStatus(status: AsrStatus): 'success' | 'exception' | 'active' | 'normal' {
  switch (status) {
    case 'success':
      return 'success';
    case 'failed':
      return 'exception';
    case 'processing':
      return 'active';
    default:
      return 'normal';
  }
}

interface AsrProgressCellProps {
  status: AsrStatus;
  progress: number;
  errorMessage?: string;
  retrying?: boolean;
  onRetry?: () => void;
}

const AsrProgressCell = ({ status, progress, errorMessage, retrying, onRetry }: AsrProgressCellProps) => {
  const label = ASR_STATUS_LABEL[status];

  if (status === 'pending') {
    return (
      <div className="source-videos-asr source-videos-asr_pending">
        <Spin size="small" />
        <span className="source-videos-asr-pending-text">{label}</span>
      </div>
    );
  }

  if (status === 'failed') {
    const tooltipMessage = errorMessage?.trim();

    return (
      <div className="source-videos-asr source-videos-asr_failed">
        {tooltipMessage ? (
          <Tooltip title={tooltipMessage}>
            <span className="source-videos-asr-failed-text">解析失败</span>
          </Tooltip>
        ) : (
          <span className="source-videos-asr-failed-text">解析失败</span>
        )}
        {onRetry ? (
          <Button
            type="link"
            size="small"
            className="source-videos-asr-retry-btn"
            icon={<LuRotateCw size={12} />}
            loading={retrying}
            onClick={onRetry}
          >
            重新解析
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="source-videos-asr">
      <div className="source-videos-asr-progress" title={label}>
        <Progress
          percent={progress}
          size="small"
          status={getProgressStatus(status)}
          showInfo
        />
      </div>
    </div>
  );
};

export default AsrProgressCell;
