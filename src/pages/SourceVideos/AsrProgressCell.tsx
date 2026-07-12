import { Button, Progress, Tooltip } from 'antd';
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
    case 'pending':
      return 'active';
    default:
      return 'normal';
  }
}

interface AsrProgressCellProps {
  status: AsrStatus;
  progress: number;
  message?: string;
  retrying?: boolean;
  onRetry?: () => void;
}

const AsrProgressCell = ({ status, progress, message, retrying, onRetry }: AsrProgressCellProps) => {
  const label = ASR_STATUS_LABEL[status];

  if (status === 'failed') {
    const failedTooltip = message ? `解析失败：${message}` : '解析失败';

    return (
      <div className="source-videos-asr source-videos-asr_failed">
        <Tooltip title={failedTooltip}>
          <span className="source-videos-asr-failed-text">解析失败</span>
        </Tooltip>
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

  const tooltipTitle = label;

  return (
    <div className="source-videos-asr">
      <Tooltip title={tooltipTitle}>
        <div className="source-videos-asr-progress">
          <Progress
            percent={progress}
            size="small"
            status={getProgressStatus(status)}
            showInfo={status !== 'pending'}
          />
        </div>
      </Tooltip>
    </div>
  );
};

export default AsrProgressCell;
