import { LuX } from 'react-icons/lu';
import DisabledActionWrap from '~/components/DisabledActionWrap';
import TimelineZoomControls from '~/components/VideoTimeline/TimelineZoomControls';
import type { TimeRange } from '~/components/VideoTimeline';
import { formatVideoDuration } from '~/utils/duration';
import '~/components/VideoTimeline/index.less';

function buildActionDisabledReason(options: {
  actionLoading: boolean;
  canAction: boolean;
  selectedRangesCount: number;
  hasSelectedPrompt: boolean;
  isOverLimit: boolean;
  maxTotalDuration: number;
}) {
  const { actionLoading, canAction, selectedRangesCount, hasSelectedPrompt, isOverLimit, maxTotalDuration } =
    options;

  if (actionLoading || canAction) return null;

  const missing: string[] = [];
  if (selectedRangesCount === 0) {
    missing.push('请选中至少一个时间片段');
  }
  if (!hasSelectedPrompt) {
    missing.push('请在上方提示词列表中选择合适的提示词');
  }
  if (isOverLimit) {
    missing.push(`已选时长不超过 ${maxTotalDuration / 60} 分钟`);
  }

  return missing.length > 0 ? missing.join('；') : null;
}

interface SelectedSegmentsPanelProps {
  videoDuration: number;
  currentTime: number;
  selectedRanges: TimeRange[];
  totalSelectedDuration: number;
  maxTotalDuration: number;
  submitting: boolean;
  aiSelecting: boolean;
  autoPlayOnSelect: boolean;
  onAutoPlayChange: (value: boolean) => void;
  zoomLevel: number;
  onZoomLevelChange: (level: number) => void;
  activeRangeId: string | null;
  onActiveRangeSelect: (rangeId: string, start: number) => void;
  onSubmit: () => void;
  onAiSelect: () => void;
  onClearAll: () => void;
  onRangeDelete: (rangeId: string) => void;
  hasSelectedPrompt: boolean;
}

const SelectedSegmentsPanel = ({
  videoDuration,
  currentTime,
  selectedRanges,
  totalSelectedDuration,
  maxTotalDuration,
  submitting,
  aiSelecting,
  autoPlayOnSelect,
  onAutoPlayChange,
  zoomLevel,
  onZoomLevelChange,
  activeRangeId,
  onActiveRangeSelect,
  onSubmit,
  onAiSelect,
  onClearAll,
  onRangeDelete,
  hasSelectedPrompt,
}: SelectedSegmentsPanelProps) => {
  const isOverLimit = totalSelectedDuration > maxTotalDuration;
  const canAction = selectedRanges.length > 0 && hasSelectedPrompt && !isOverLimit;
  const actionLoading = submitting || aiSelecting;

  const disabledReason = buildActionDisabledReason({
    actionLoading,
    canAction,
    selectedRangesCount: selectedRanges.length,
    hasSelectedPrompt,
    isOverLimit,
    maxTotalDuration,
  });

  const aiSelectButton = (
    <button
      type="button"
      className="slice-ai-select-btn"
      onClick={onAiSelect}
      disabled={actionLoading || !canAction}
    >
      {aiSelecting ? '选片中...' : 'AI 选片'}
    </button>
  );

  const submitButton = (
    <button
      type="button"
      className="slice-submit-btn"
      onClick={onSubmit}
      disabled={actionLoading || !canAction}
    >
      {submitting ? '处理中...' : '一键成片'}
    </button>
  );

  return (
    <div className="slice-selected-panel">
      <div className="slice-selected-header">
        <div className="slice-selected-header-left">
          <div className="slice-selected-title-row">
            <h3 className="slice-selected-title">
              已选中片段
              <span className="slice-selected-subtitle">（左键拖拽可继续新增片段）</span>
            </h3>
            <p className="slice-selected-stats">
              总时长约 {formatVideoDuration(videoDuration)} · 播放位置 {formatVideoDuration(currentTime)}
              {selectedRanges.length > 0 && (
                <>
                  {' '}
                  · 已选时长 {formatVideoDuration(Math.round(totalSelectedDuration))}
                  {isOverLimit && (
                    <span className="slice-over-limit">（超出 {maxTotalDuration / 60} 分钟限制）</span>
                  )}
                </>
              )}
            </p>
          </div>
        </div>

        <div className="slice-selected-header-right">
          <DisabledActionWrap disabledReason={disabledReason}>{submitButton}</DisabledActionWrap>
          <DisabledActionWrap disabledReason={disabledReason}>{aiSelectButton}</DisabledActionWrap>
          <button
            type="button"
            className="slice-secondary-btn slice-secondary-btn_danger"
            onClick={onClearAll}
            disabled={selectedRanges.length === 0 || actionLoading}
          >
            清空全部
          </button>
        </div>
      </div>

      <div className="slice-selected-toolbar">
        <div className="slice-selected-tags">
          {selectedRanges.length === 0 ? (
            <span className="slice-selected-empty">暂无选中片段，请在下方时间轴左键拖拽标记</span>
          ) : (
            selectedRanges.map((range, index) => (
              <button
                key={range.id}
                type="button"
                className={`slice-segment-tag${activeRangeId === range.id ? ' active' : ''}`}
                onClick={() => onActiveRangeSelect(range.id, range.start)}
              >
                <span>
                  片段 {index + 1}: {formatVideoDuration(range.start)} - {formatVideoDuration(range.end)}
                </span>
                <span
                  className="slice-segment-tag-remove"
                  role="button"
                  tabIndex={0}
                  aria-label={`删除片段 ${index + 1}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    onRangeDelete(range.id);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      event.stopPropagation();
                      onRangeDelete(range.id);
                    }
                  }}
                >
                  <LuX size={12} />
                </span>
              </button>
            ))
          )}
        </div>

        <div className="slice-selected-zoom">
          <span className="slice-selected-zoom-label">时间轴缩放</span>
          <TimelineZoomControls zoomLevel={zoomLevel} onChange={onZoomLevelChange} />
        </div>
      </div>
    </div>
  );
};

export default SelectedSegmentsPanel;
