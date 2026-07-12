import { useRef, useState } from 'react';
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
  getTextSelectionOffsets,
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
  onDeleteSelectedRange: (
    segmentId: string,
    textElement: HTMLElement | null,
    savedSelection?: { start: number; end: number } | null
  ) => void;
  onCopySegment: (segmentId: string) => void;
  onClearAll: () => void;
  onPreview: () => void;
  onSave: () => void;
  savingProject?: boolean;
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
  onDeleteSelectedRange,
  onCopySegment,
  onClearAll,
  onPreview,
  onSave,
  savingProject = false,
  onSaveAs,
  onExportDraft,
  onSubmit,
}: SelectedCopyPanelProps) => {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const textSelectionRef = useRef<{ segmentId: string; start: number; end: number } | null>(null);
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
        <button type="button" onClick={onSave} disabled={segments.length === 0 || savingProject}>
          {savingProject ? '保存中...' : '保存'}
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
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => handleDrop(index)}
                onClick={() => {
                  const selection = window.getSelection();
                  if (selection && !selection.isCollapsed) return;

                  onActiveSegmentChange(segment.id);
                  onSeek(segment.start);
                }}
              >
                <div className="manual-slice-copy-item-head">
                  {mode === 'edit' && (
                    <span
                      className="manual-slice-copy-drag"
                      draggable
                      onDragStart={(event) => {
                        setDragIndex(index);
                        event.stopPropagation();
                      }}
                      onDragEnd={() => setDragIndex(null)}
                      onClick={(event) => event.stopPropagation()}
                      onMouseDown={(event) => event.stopPropagation()}
                    >
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

                <p
                  className={`manual-slice-copy-text${isActive ? ' manual-slice-copy-text_active' : ''}`}
                  data-copy-text-id={segment.id}
                  onMouseDown={(event) => event.stopPropagation()}
                  onMouseUp={(event) => {
                    event.stopPropagation();
                    const offsets = getTextSelectionOffsets(event.currentTarget);
                    textSelectionRef.current = offsets
                      ? { segmentId: segment.id, ...offsets }
                      : null;
                  }}
                  onClick={(event) => event.stopPropagation()}
                >
                  {segment.text}
                </p>

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
                        onCopySegment(segment.id);
                      }}
                    >
                      <LuCopy size={14} />
                      复制
                    </button>
                    <div className="manual-slice-copy-actions-delete-group">
                      <button
                        type="button"
                        className="danger"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={(event) => {
                          event.stopPropagation();
                          const textElement = event.currentTarget
                            .closest('.manual-slice-copy-item')
                            ?.querySelector<HTMLElement>(`[data-copy-text-id="${segment.id}"]`) ?? null;
                          const savedSelection =
                            textSelectionRef.current?.segmentId === segment.id
                              ? textSelectionRef.current
                              : null;
                          onDeleteSelectedRange(segment.id, textElement, savedSelection);
                        }}
                      >
                        <LuScissors size={14} />
                        部分删除
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
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
      {segments.length > 0 && mode === 'edit' ? (
        <p className="manual-slice-copy-tip">在片段文案中拖选文字后，点击「删除选中区」可移除选中内容及其对应时长。</p>
      ) : null}
    </div>
  );
};

export default SelectedCopyPanel;
