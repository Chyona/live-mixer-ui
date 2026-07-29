import { Dropdown } from 'antd';
import { LuChevronDown, LuX } from 'react-icons/lu';
import type { ReactNode } from 'react';
import DisabledActionWrap from '~/components/DisabledActionWrap';
import TimelineZoomControls from '~/components/VideoTimeline/TimelineZoomControls';
import type { TimeRange } from '~/components/VideoTimeline';
import { formatVideoDuration } from '~/utils/duration';
import '~/components/VideoTimeline/index.css';

function buildActionDisabledReason(options: {
  actionLoading: boolean;
  canAction: boolean;
  selectedRangesCount: number;
  hasSelectedPrompt: boolean;
  isUnderMin: boolean;
  isOverLimit: boolean;
  minTotalDuration: number;
  maxTotalDuration: number;
}) {
  const {
    actionLoading,
    canAction,
    selectedRangesCount,
    hasSelectedPrompt,
    isUnderMin,
    isOverLimit,
    minTotalDuration,
    maxTotalDuration,
  } = options;

  if (actionLoading || canAction) return null;

  const missing: string[] = [];
  if (selectedRangesCount === 0) {
    missing.push('请选中至少一个时间片段');
  }
  if (!hasSelectedPrompt) {
    missing.push('请选择 AI 提示词');
  }
  if (isUnderMin) {
    missing.push(`已选时长需不少于 ${minTotalDuration / 60} 分钟`);
  }
  if (isOverLimit) {
    missing.push(`已选时长需不超过 ${maxTotalDuration / 60} 分钟`);
  }

  return missing.length > 0 ? missing.join('；') : null;
}

interface SelectedSegmentsPanelProps {
  videoDuration: number;
  selectedRanges: TimeRange[];
  totalSelectedDuration: number;
  minTotalDuration: number;
  maxTotalDuration: number;
  submitting: boolean;
  aiSelecting: boolean;
  zoomLevel: number;
  onZoomLevelChange: (level: number) => void;
  activeRangeId: string | null;
  onActiveRangeSelect: (rangeId: string, start: number) => void;
  onSubmit: () => void;
  onAiSelect: () => void;
  onClearAll: () => void;
  onRangeDelete: (rangeId: string) => void;
  hasSelectedPrompt: boolean;
  /** 右侧操作区前置内容（如 AI 提示词下拉） */
  headerExtra?: ReactNode;
  /** 折叠区等窄空间下的紧凑布局 */
  compact?: boolean;
}

const SelectedSegmentsPanel = ({
  videoDuration,
  selectedRanges,
  totalSelectedDuration,
  minTotalDuration,
  maxTotalDuration,
  submitting,
  aiSelecting,
  zoomLevel,
  onZoomLevelChange,
  activeRangeId,
  onActiveRangeSelect,
  onSubmit,
  onAiSelect,
  onClearAll,
  onRangeDelete,
  hasSelectedPrompt,
  headerExtra,
  compact = false,
}: SelectedSegmentsPanelProps) => {
  const isUnderMin =
    selectedRanges.length > 0 && totalSelectedDuration < minTotalDuration;
  const isOverLimit = totalSelectedDuration > maxTotalDuration;
  const canAction =
    selectedRanges.length > 0 && hasSelectedPrompt && !isUnderMin && !isOverLimit;
  const actionLoading = submitting || aiSelecting;

  const disabledReason = buildActionDisabledReason({
    actionLoading,
    canAction,
    selectedRangesCount: selectedRanges.length,
    hasSelectedPrompt,
    isUnderMin,
    isOverLimit,
    minTotalDuration,
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

  const rangesDropdown = (
    <Dropdown
      trigger={['click']}
      placement="bottomLeft"
      dropdownRender={() => (
        <div className="slice-selected-ranges-dropdown">
          <div className="slice-selected-ranges-dropdown__head">
            <span>已选片段</span>
            {selectedRanges.length > 0 ? (
              <span className="slice-selected-ranges-dropdown__sum">
                共 {selectedRanges.length} 段 · {formatVideoDuration(totalSelectedDuration)}
              </span>
            ) : null}
          </div>
          {selectedRanges.length === 0 ? (
            <p className="slice-selected-ranges-dropdown__empty">
              暂无选中片段，请在下方时间轴左键拖拽标记
            </p>
          ) : (
            <ul className="slice-selected-ranges-dropdown__list">
              {selectedRanges.map((range, index) => {
                const active = activeRangeId === range.id;
                return (
                  <li
                    key={range.id}
                    className={[
                      'slice-selected-ranges-dropdown__item',
                      active ? 'is-active' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <button
                      type="button"
                      className="slice-selected-ranges-dropdown__main"
                      onClick={() => onActiveRangeSelect(range.id, range.start)}
                    >
                      <span className="slice-selected-ranges-dropdown__index">
                        片段 {index + 1}
                      </span>
                      <span className="slice-selected-ranges-dropdown__time">
                        {formatVideoDuration(range.start)} - {formatVideoDuration(range.end)}
                      </span>
                      <span className="slice-selected-ranges-dropdown__dur">
                        {formatVideoDuration(range.end - range.start)}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="slice-selected-ranges-dropdown__remove"
                      aria-label={`删除片段 ${index + 1}`}
                      onClick={() => onRangeDelete(range.id)}
                    >
                      <LuX size={14} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    >
      <button
        type="button"
        className={[
          'slice-selected-ranges-trigger',
          selectedRanges.length > 0 ? 'has-ranges' : '',
          isUnderMin || isOverLimit ? 'has-warning' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <span>
          {selectedRanges.length === 0
            ? '未选片段'
            : `已选 ${selectedRanges.length} 段`}
        </span>
        {selectedRanges.length > 0 ? (
          <span className="slice-selected-ranges-trigger__dur">
            {formatVideoDuration(totalSelectedDuration)}
          </span>
        ) : null}
        <LuChevronDown size={14} aria-hidden />
      </button>
    </Dropdown>
  );

  return (
    <div
      className={['slice-selected-panel', compact ? 'slice-selected-panel_compact' : '']
        .filter(Boolean)
        .join(' ')}
    >
      <div className="slice-selected-header">
        {!compact ? (
          <div className="slice-selected-header-left">
            <div className="slice-selected-title-row">
              <h3 className="slice-selected-title">
                已选中片段
                <span className="slice-selected-subtitle">（左键拖拽可继续新增片段）</span>
              </h3>
              {selectedRanges.length > 0 && (
                <p className="slice-selected-stats">
                  已选时长 {formatVideoDuration(totalSelectedDuration)}
                  {isUnderMin && (
                    <span className="slice-under-min">
                      （需不少于 {minTotalDuration / 60} 分钟）
                    </span>
                  )}
                  {isOverLimit && (
                    <span className="slice-over-limit">（超出 {maxTotalDuration / 60} 分钟限制）</span>
                  )}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="slice-selected-header-left slice-selected-header-left_compact">
            {rangesDropdown}
            {videoDuration > 0 ? (
              <span className="slice-timeline-duration">
                视频总时长 {formatVideoDuration(videoDuration)}
              </span>
            ) : null}
            <div className="slice-selected-zoom">
              <TimelineZoomControls zoomLevel={zoomLevel} onChange={onZoomLevelChange} />
            </div>
          </div>
        )}

        <div className="slice-selected-header-right">
          {headerExtra}
          <DisabledActionWrap disabledReason={disabledReason}>{submitButton}</DisabledActionWrap>
          <DisabledActionWrap disabledReason={disabledReason}>{aiSelectButton}</DisabledActionWrap>
          <button
            type="button"
            className="slice-secondary-btn slice-secondary-btn_danger"
            onClick={onClearAll}
            disabled={selectedRanges.length === 0 || actionLoading}
          >
            清空
          </button>
        </div>
      </div>

      {!compact ? (
        <div className="slice-selected-toolbar">
          <div
            className={`slice-selected-tags${selectedRanges.length === 0 ? ' slice-selected-tags_empty' : ''}`}
          >
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
                    片段 {index + 1}: {formatVideoDuration(range.start)} -{' '}
                    {formatVideoDuration(range.end)}
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

          <div className="slice-selected-meta">
            {videoDuration > 0 && (
              <span className="slice-timeline-duration">
                视频总时长 {formatVideoDuration(videoDuration)}
              </span>
            )}
            <div className="slice-selected-zoom">
              <span className="slice-selected-zoom-label">时间轴缩放</span>
              <TimelineZoomControls zoomLevel={zoomLevel} onChange={onZoomLevelChange} />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default SelectedSegmentsPanel;
