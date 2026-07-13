import { useRef, useState } from 'react';
import {
  LuArrowLeft,
  LuCopy,
  LuGripVertical,
  LuPlay,
  LuScissors,
  LuTextSelect,
  LuTrash2,
} from 'react-icons/lu';
import type { SelectedCopySegment } from '../types';
import {
  formatSliceTime,
  getSpeakerColor,
  getTextSelectionOffsets,
  getTotalSelectedDuration,
  reorderSegments,
} from '../utils';
import { formatVideoDuration } from '~/utils/duration';

interface SelectedCopyPanelProps {
  segments: SelectedCopySegment[];
  activeSegmentId: string | null;
  speakerIds: string[];
  maxTotalDuration: number;
  submitting: boolean;
  onActiveSegmentChange: (segmentId: string | null) => void;
  onSeek: (time: number) => void;
  onReorder: (segments: SelectedCopySegment[]) => void;
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
  segments,
  activeSegmentId,
  speakerIds,
  maxTotalDuration,
  submitting,
  onActiveSegmentChange,
  onSeek,
  onReorder,
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
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const textSelectionRef = useRef<{ segmentId: string; start: number; end: number } | null>(null);
  const totalDuration = getTotalSelectedDuration(segments);
  const isOverLimit = totalDuration > maxTotalDuration;
  const canDragSort = segments.length > 1;
  const hasSegments = segments.length > 0;

  const resetDragState = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleDrop = (toIndex: number) => {
    if (dragIndex == null || dragIndex === toIndex) {
      resetDragState();
      return;
    }

    onReorder(reorderSegments(segments, dragIndex, toIndex));
    resetDragState();
  };

  return (
    <div className="slice-editor-panel slice-editor-panel_copy">
      <div className="slice-editor-copy-top">
        <div
          className={[
            'slice-editor-copy-head',
            !hasSegments ? 'slice-editor-copy-head_empty' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <div className="slice-editor-panel-title">文案预览</div>
          {hasSegments ? (
            <span
              className={[
                'slice-editor-copy-stats',
                isOverLimit ? 'slice-editor-copy-stats_over' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              已选 {segments.length} 段 · 总时长 {formatVideoDuration(Math.round(totalDuration))}
              {isOverLimit ? ` · 超出 ${maxTotalDuration / 60} 分钟限制` : ''}
            </span>
          ) : null}
          {!hasSegments ? (
            <button
              type="button"
              className="slice-editor-copy-submit-empty primary"
              disabled
            >
              提交成片
            </button>
          ) : null}
        </div>

        {hasSegments ? (
          <div className="slice-editor-copy-toolbar">
            <div className="slice-editor-copy-toolbar-group">
              <button type="button" onClick={onPreview}>
                <LuPlay size={14} />
                连续预览
              </button>
              <button type="button" onClick={onSave} disabled={savingProject}>
                {savingProject ? '保存中...' : '保存'}
              </button>
              <button type="button" onClick={onSaveAs}>
                另存为
              </button>
            </div>
            <div className="slice-editor-copy-toolbar-group slice-editor-copy-toolbar-group_primary">
              <button type="button" className="danger" onClick={onClearAll}>
                清空
              </button>
              <button
                type="button"
                className="primary"
                onClick={onSubmit}
                disabled={submitting || isOverLimit}
              >
                {submitting ? '提交中...' : '提交成片'}
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div
        className={[
          'slice-editor-copy-list',
          segments.length === 0 ? 'slice-editor-copy-list_empty' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {segments.length === 0 ? (
          <div className="slice-editor-copy-empty">
            <div className="slice-editor-copy-empty-icon" aria-hidden>
              <LuTextSelect size={22} />
            </div>
            <p className="slice-editor-copy-empty-title">等待选片</p>
            <p className="slice-editor-copy-empty-desc">
              从左侧文案中选择整段或部分文字，选中内容会出现在这里。
            </p>
            <span className="slice-editor-copy-empty-hint">
              <LuArrowLeft size={14} />
              在左侧「文案分段」中操作
            </span>
          </div>
        ) : (
          segments.map((segment, index) => {
            const color = getSpeakerColor(segment.speakerId, speakerIds);
            const isActive = activeSegmentId === segment.id;

            return (
              <div
                key={segment.id}
                className={[
                  'slice-editor-copy-item',
                  isActive ? 'active' : '',
                  dragIndex === index ? 'slice-editor-copy-item_dragging' : '',
                  dragOverIndex === index && dragIndex !== index
                    ? 'slice-editor-copy-item_drag-over'
                    : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onDragEnter={(event) => {
                  if (dragIndex == null) return;
                  event.preventDefault();
                  setDragOverIndex(index);
                }}
                onDragOver={(event) => {
                  if (dragIndex == null) return;
                  event.preventDefault();
                  event.dataTransfer.dropEffect = 'move';
                  if (dragOverIndex !== index) {
                    setDragOverIndex(index);
                  }
                }}
                onDragLeave={(event) => {
                  if (dragIndex == null) return;
                  const related = event.relatedTarget as Node | null;
                  if (related && event.currentTarget.contains(related)) return;
                  setDragOverIndex((current) => (current === index ? null : current));
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handleDrop(index);
                }}
                onClick={() => {
                  onActiveSegmentChange(segment.id);
                  onSeek(segment.start);
                }}
              >
                <div className="slice-editor-copy-item-head">
                  {canDragSort ? (
                    <span
                      className="slice-editor-copy-drag"
                      draggable
                      title="拖动排序"
                      aria-label="拖动排序"
                      onDragStart={(event) => {
                        setDragIndex(index);
                        setDragOverIndex(index);
                        event.dataTransfer.effectAllowed = 'move';
                        event.dataTransfer.setData('text/plain', segment.id);
                        event.stopPropagation();
                      }}
                      onDragEnd={resetDragState}
                      onClick={(event) => event.stopPropagation()}
                      onMouseDown={(event) => event.stopPropagation()}
                    >
                      <LuGripVertical size={14} />
                    </span>
                  ) : null}
                  <span className="slice-editor-copy-index">片段 {index + 1}</span>
                  <span className="slice-editor-speaker" style={{ color }}>
                    {segment.speakerName}
                  </span>
                  <span className="slice-editor-copy-time">
                    {formatSliceTime(segment.start)} - {formatSliceTime(segment.end)}
                  </span>
                </div>

                <p
                  className={`slice-editor-copy-text${isActive ? ' slice-editor-copy-text_active' : ''}`}
                  data-copy-text-id={segment.id}
                  onMouseDown={(event) => event.stopPropagation()}
                  onMouseUp={(event) => {
                    event.stopPropagation();
                    const target = event.currentTarget;
                    requestAnimationFrame(() => {
                      const offsets = getTextSelectionOffsets(target);
                      textSelectionRef.current = offsets
                        ? { segmentId: segment.id, ...offsets }
                        : null;
                      if (offsets) {
                        onActiveSegmentChange(segment.id);
                        onSeek(segment.start);
                      }
                    });
                  }}
                  onClick={(event) => {
                    event.stopPropagation();
                    const selection = window.getSelection();
                    if (selection && !selection.isCollapsed) return;

                    onActiveSegmentChange(segment.id);
                    onSeek(segment.start);
                  }}
                >
                  {segment.text}
                </p>

                {isActive && (
                  <div className="slice-editor-copy-actions">
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
                    <div className="slice-editor-copy-actions-delete-group">
                      <button
                        type="button"
                        className="danger"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={(event) => {
                          event.stopPropagation();
                          const textElement = event.currentTarget
                            .closest('.slice-editor-copy-item')
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
      {segments.length > 0 ? (
        <p className="slice-editor-copy-tip">
          {canDragSort
            ? '拖动左侧把手可调整片段顺序；单击某一片段可对其进行编辑。'
            : '单击该片段可对其进行编辑。'}
        </p>
      ) : null}
    </div>
  );
};

export default SelectedCopyPanel;
