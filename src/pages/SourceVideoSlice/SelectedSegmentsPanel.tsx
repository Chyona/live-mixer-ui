import { Switch } from 'antd';
import { LuX } from 'react-icons/lu';
import TimelineZoomControls from '~/components/VideoTimeline/TimelineZoomControls';
import type { TimeRange } from '~/components/VideoTimeline';
import { formatVideoDuration } from '../SourceVideos/utils';
import '~/components/VideoTimeline/index.less';

function formatClipTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  return `${mins}:${String(secs).padStart(2, '0')}`;
}

interface SelectedSegmentsPanelProps {
  videoDuration: number;
  currentTime: number;
  selectedRanges: TimeRange[];
  totalSelectedDuration: number;
  maxTotalDuration: number;
  submitting: boolean;
  autoPlayOnSelect: boolean;
  onAutoPlayChange: (value: boolean) => void;
  zoomLevel: number;
  onZoomLevelChange: (level: number) => void;
  activeRangeId: string | null;
  onActiveRangeSelect: (rangeId: string, start: number) => void;
  onSubmit: () => void;
  onClearAll: () => void;
  onRangeDelete: (rangeId: string) => void;
}

const SelectedSegmentsPanel = ({
  videoDuration,
  currentTime,
  selectedRanges,
  totalSelectedDuration,
  maxTotalDuration,
  submitting,
  autoPlayOnSelect,
  onAutoPlayChange,
  zoomLevel,
  onZoomLevelChange,
  activeRangeId,
  onActiveRangeSelect,
  onSubmit,
  onClearAll,
  onRangeDelete,
}: SelectedSegmentsPanelProps) => {
  const isOverLimit = totalSelectedDuration > maxTotalDuration;

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
              总时长约 {formatClipTime(videoDuration)} · 播放位置 {formatClipTime(currentTime)}
              {selectedRanges.length > 0 && (
                <>
                  {' '}
                  · 已选时长 {formatVideoDuration(Math.round(totalSelectedDuration))}
                  {isOverLimit && (
                    <span className="slice-selected-over">（超出 {maxTotalDuration / 60} 分钟限制）</span>
                  )}
                </>
              )}
            </p>
          </div>
        </div>

        <div className="slice-selected-header-right">
          {/* <label className="slice-selected-autoplay">
            <span>选中后自动播放</span>
            <Switch size="small" checked={autoPlayOnSelect} onChange={onAutoPlayChange} />
          </label> */}
          <button
            type="button"
            className="slice-submit-btn"
            onClick={onSubmit}
            disabled={submitting || selectedRanges.length === 0 || isOverLimit}
          >
            {submitting ? '处理中...' : '一键成片'}
          </button>
          <button
            type="button"
            className="slice-secondary-btn slice-secondary-btn_danger"
            onClick={onClearAll}
            disabled={selectedRanges.length === 0}
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
                  片段 {index + 1}: {formatClipTime(range.start)} - {formatClipTime(range.end)}
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
