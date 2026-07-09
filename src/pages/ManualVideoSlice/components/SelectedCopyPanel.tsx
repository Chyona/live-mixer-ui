import { useState } from 'react';
import {
  LuCopy,
  LuGripVertical,
  LuMinus,
  LuPlay,
  LuPlus,
  LuScissors,
  LuTrash2,
} from 'react-icons/lu';
import type { ManualSliceMode, SelectedCopySegment } from '../types';
import {
  formatSliceTime,
  getSpeakerColor,
  getTotalSelectedDuration,
  reorderSegments,
} from '../utils';
import { formatVideoDuration } from '../../SourceVideos/utils';

interface SelectedCopyPanelProps {
  mode: ManualSliceMode;
  segments: SelectedCopySegment[];
  activeSegmentId: string | null;
  speakerIds: string[];
  videoDuration: number;
  maxTotalDuration: number;
  submitting: boolean;
  onModeChange: (mode: ManualSliceMode) => void;
  onActiveSegmentChange: (segmentId: string | null) => void;
  onSeek: (time: number) => void;
  onReorder: (segments: SelectedCopySegment[]) => void;
  onUpdateSegment: (segment: SelectedCopySegment) => void;
  onDeleteSegment: (segmentId: string) => void;
  onSplitSegment: (segmentId: string) => void;
  onCopySegment: (segmentId: string) => void;
  onClearAll: () => void;
  onPreview: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onExportDraft: () => void;
  onSubmit: () => void;
}

const SelectedCopyPanel = ({
  mode,
  segments,
  activeSegmentId,
  speakerIds,
  videoDuration,
  maxTotalDuration,
  submitting,
  onModeChange,
  onActiveSegmentChange,
  onSeek,
  onReorder,
  onUpdateSegment,
  onDeleteSegment,
  onSplitSegment,
  onCopySegment,
  onClearAll,
  onPreview,
  onSave,
  onSaveAs,
  onExportDraft,
  onSubmit,
}: SelectedCopyPanelProps) => {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const totalDuration = getTotalSelectedDuration(segments);
  const isOverLimit = totalDuration > maxTotalDuration;

  const handleDrop = (toIndex: number) => {
    if (dragIndex == null) return;
    onReorder(reorderSegments(segments, dragIndex, toIndex));
    setDragIndex(null);
  };

  return (
    <div className="manual-slice-copy-panel">
      <div className="manual-slice-copy-header">
        <div>
          <div className="manual-slice-panel-title">文案预览</div>
          <p className="manual-slice-copy-stats">
            已选 {segments.length} 段 · 总时长 {formatVideoDuration(Math.round(totalDuration))}
            {isOverLimit && (
              <span className="manual-slice-over-limit">
                （超出 {maxTotalDuration / 60} 分钟限制）
              </span>
            )}
          </p>
        </div>
        <div className="manual-slice-mode-tabs">
          <button
            type="button"
            className={mode === 'select' ? 'active' : ''}
            onClick={() => onModeChange('select')}
          >
            选择文案
          </button>
          <button
            type="button"
            className={mode === 'edit' ? 'active' : ''}
            onClick={() => onModeChange('edit')}
          >
            编辑文案
          </button>
        </div>
      </div>

      <div className="manual-slice-copy-toolbar">
        <button type="button" onClick={onPreview} disabled={segments.length === 0}>
          <LuPlay size={14} />
          连续预览
        </button>
        <button type="button" onClick={onSave} disabled={segments.length === 0}>
          保存
        </button>
        <button type="button" onClick={onSaveAs} disabled={segments.length === 0}>
          另存为
        </button>
        {/* <button type="button" onClick={onExportDraft} disabled={segments.length === 0}>
          导出草稿
        </button> */}
        <button type="button" className="danger" onClick={onClearAll} disabled={segments.length === 0}>
          清空
        </button>
        <button
          type="button"
          className="primary"
          onClick={onSubmit}
          disabled={submitting || segments.length === 0 || isOverLimit}
        >
          {submitting ? '提交中...' : '提交成片'}
        </button>
      </div>

      <div className="manual-slice-copy-list">
        {segments.length === 0 ? (
          <div className="manual-slice-copy-empty">
            请从左侧文案中选择整段或部分文字，选中内容会出现在这里。
          </div>
        ) : (
          segments.map((segment, index) => {
            const color = getSpeakerColor(segment.speakerId, speakerIds);
            const isActive = activeSegmentId === segment.id;

            return (
              <div
                key={segment.id}
                className={`manual-slice-copy-item${isActive ? ' active' : ''}`}
                draggable={mode === 'edit'}
                onDragStart={() => setDragIndex(index)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => handleDrop(index)}
                onClick={() => {
                  onActiveSegmentChange(segment.id);
                  onSeek(segment.start);
                }}
              >
                <div className="manual-slice-copy-item-head">
                  {mode === 'edit' && (
                    <span className="manual-slice-copy-drag">
                      <LuGripVertical size={14} />
                    </span>
                  )}
                  <span className="manual-slice-copy-index">片段 {index + 1}</span>
                  <span className="manual-slice-speaker" style={{ color }}>
                    {segment.speakerName}
                  </span>
                  <span className="manual-slice-copy-time">
                    {formatSliceTime(segment.start)} - {formatSliceTime(segment.end)}
                  </span>
                </div>

                <p className="manual-slice-copy-text">{segment.text}</p>

                {mode === 'edit' && isActive && (
                  <div className="manual-slice-copy-actions">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onUpdateSegment({
                          ...segment,
                          start: Math.max(0, segment.start - 0.5),
                        });
                      }}
                    >
                      <LuMinus size={14} />
                      起点 -0.5s
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onUpdateSegment({
                          ...segment,
                          start: Math.min(segment.end - 0.5, segment.start + 0.5),
                        });
                      }}
                    >
                      <LuPlus size={14} />
                      起点 +0.5s
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onUpdateSegment({
                          ...segment,
                          end: Math.max(segment.start + 0.5, segment.end - 0.5),
                        });
                      }}
                    >
                      <LuMinus size={14} />
                      终点 -0.5s
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onUpdateSegment({
                          ...segment,
                          end: Math.min(videoDuration || segment.end + 0.5, segment.end + 0.5),
                        });
                      }}
                    >
                      <LuPlus size={14} />
                      终点 +0.5s
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onSplitSegment(segment.id);
                      }}
                    >
                      <LuScissors size={14} />
                      拆分
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onCopySegment(segment.id);
                      }}
                    >
                      <LuCopy size={14} />
                      复制
                    </button>
                    <button
                      type="button"
                      className="danger"
                      onClick={(event) => {
                        event.stopPropagation();
                        onDeleteSegment(segment.id);
                      }}
                    >
                      <LuTrash2 size={14} />
                      删除
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default SelectedCopyPanel;
