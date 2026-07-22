import { useCallback, useRef, useState } from 'react';
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
  getSegmentExtendableSeconds,
  getSpeakerColor,
  getTextSelectionOffsets,
  getTotalSelectedDuration,
  reorderSegments,
  SEGMENT_EXTEND_MAX_SEC,
  SEGMENT_EXTEND_STEP_SEC,
} from '../utils';
import { formatVideoDuration } from '~/utils/duration';

type DropMarker = {
  index: number;
  placement: 'before' | 'after';
};

function getReorderToIndex(target: DropMarker, length: number) {
  if (target.placement === 'before') return target.index;
  return Math.min(target.index + 1, length - 1);
}

function wouldReorder(fromIndex: number, target: DropMarker, length: number) {
  let insertIndex = target.placement === 'before' ? target.index : Math.min(target.index + 1, length);
  if (fromIndex < insertIndex) {
    insertIndex -= 1;
  }
  return insertIndex !== fromIndex;
}

interface SelectedCopyPanelProps {
  segments: SelectedCopySegment[];
  activeSegmentId: string | null;
  speakerIds: string[];
  maxTotalDuration: number;
  videoDuration: number;
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
  onExtendSegment: (segmentId: string, edge: 'start' | 'end') => void;
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
  videoDuration,
  submitting,
  onActiveSegmentChange,
  onSeek,
  onReorder,
  onDeleteSegment,
  onDeleteSelectedRange,
  onCopySegment,
  onExtendSegment,
  onClearAll,
  onPreview,
  onSave,
  savingProject = false,
  onSaveAs,
  onExportDraft,
  onSubmit,
}: SelectedCopyPanelProps) => {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropMarker, setDropMarker] = useState<DropMarker | null>(null);
  const dragIndexRef = useRef<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const pointerDraggingRef = useRef(false);
  const suppressItemClickRef = useRef(false);
  const textSelectionRef = useRef<{ segmentId: string; start: number; end: number } | null>(null);
  const totalDuration = getTotalSelectedDuration(segments);
  const isOverLimit = totalDuration > maxTotalDuration;
  const canDragSort = segments.length > 1;
  const hasSegments = segments.length > 0;

  const resetDragState = () => {
    pointerDraggingRef.current = false;
    dragIndexRef.current = null;
    setDragIndex(null);
    setDropMarker(null);
  };

  const getDropTarget = useCallback((clientY: number): DropMarker | null => {
    const items = listRef.current?.querySelectorAll<HTMLElement>('.slice-editor-copy-item');
    if (!items?.length) return null;

    const itemElements = Array.from(items);
    const lastIndex = itemElements.length - 1;
    for (let i = 0; i < itemElements.length; i += 1) {
      const item = itemElements[i];
      if (!item) continue;
      const rect = item.getBoundingClientRect();
      if (clientY < rect.top + rect.height / 2) {
        return { index: i, placement: 'before' };
      }
    }

    return { index: lastIndex, placement: 'after' };
  }, []);

  const finishPointerDrag = useCallback(
    (clientY: number) => {
      const fromIndex = dragIndexRef.current;
      const target = getDropTarget(clientY);
      if (fromIndex != null && target && wouldReorder(fromIndex, target, segments.length)) {
        const toIndex = getReorderToIndex(target, segments.length);
        onReorder(reorderSegments(segments, fromIndex, toIndex));
        suppressItemClickRef.current = true;
      }
      resetDragState();
    },
    [getDropTarget, onReorder, segments]
  );

  const handleDragHandlePointerDown = (index: number) => (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!canDragSort) return;

    event.preventDefault();
    event.stopPropagation();
    suppressItemClickRef.current = false;
    pointerDraggingRef.current = true;
    dragIndexRef.current = index;
    setDragIndex(index);
    setDropMarker({ index, placement: 'before' });
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleDragHandlePointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!pointerDraggingRef.current || dragIndexRef.current == null) return;

    const target = getDropTarget(event.clientY);
    if (!target) return;

    setDropMarker(target);
    if (wouldReorder(dragIndexRef.current, target, segments.length)) {
      suppressItemClickRef.current = true;
    }
  };

  const handleDragHandlePointerUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!pointerDraggingRef.current) return;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    finishPointerDrag(event.clientY);
  };

  const handleDragHandlePointerCancel = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!pointerDraggingRef.current) return;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    resetDragState();
  };

  return (
    <div className="slice-editor-panel slice-editor-panel_copy">
      <div className="slice-editor-copy-top">
        <div className="slice-editor-copy-head">
          <div className="slice-editor-panel-title">文案预览</div>
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
        </div>

        <div className="slice-editor-copy-toolbar">
          <div className="slice-editor-copy-toolbar-group">
            <button type="button" onClick={onPreview} disabled={!hasSegments}>
              <LuPlay size={14} />
              连续预览
            </button>
            <button type="button" onClick={onSave} disabled={!hasSegments || savingProject}>
              {savingProject ? '保存中...' : '保存'}
            </button>
            <button type="button" onClick={onSaveAs} disabled={!hasSegments}>
              另存为
            </button>
          </div>
          <div className="slice-editor-copy-toolbar-group slice-editor-copy-toolbar-group_primary">
            <button type="button" className="danger" onClick={onClearAll} disabled={!hasSegments}>
              清空
            </button>
            <button
              type="button"
              className="primary"
              onClick={onSubmit}
              disabled={!hasSegments || submitting || isOverLimit}
            >
              {submitting ? '提交中...' : '提交成片'}
            </button>
          </div>
        </div>
      </div>

      <div
        ref={listRef}
        className={[
          'slice-editor-copy-list',
          segments.length === 0 ? 'slice-editor-copy-list_empty' : '',
          dragIndex != null ? 'slice-editor-copy-list_dragging' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {segments.length === 0 ? (
          <div className="slice-editor-copy-empty">
            <div className="slice-editor-copy-empty-icon" aria-hidden>
              <LuTextSelect size={22} />
            </div>
            <p className="slice-editor-copy-empty-desc">
              从左侧「文案分段」中选择整段或部分文字，内容将显示在这里
            </p>
            <span className="slice-editor-copy-empty-hint">
              <LuArrowLeft size={14} />
              双击选整段，拖选提取片段
            </span>
          </div>
        ) : (
          segments.map((segment, index) => {
            const color = getSpeakerColor(segment.speakerId, speakerIds);
            const isActive = activeSegmentId === segment.id;
            const showInsertBefore =
              dragIndex != null &&
              dropMarker?.index === index &&
              dropMarker.placement === 'before' &&
              wouldReorder(dragIndex, dropMarker, segments.length);
            const showInsertAfter =
              dragIndex != null &&
              dropMarker?.index === index &&
              dropMarker.placement === 'after' &&
              wouldReorder(dragIndex, dropMarker, segments.length);

            return (
              <div
                key={segment.id}
                className={[
                  'slice-editor-copy-item',
                  isActive ? 'active' : '',
                  dragIndex === index ? 'slice-editor-copy-item_dragging' : '',
                  showInsertBefore ? 'slice-editor-copy-item_insert-before' : '',
                  showInsertAfter ? 'slice-editor-copy-item_insert-after' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => {
                  if (suppressItemClickRef.current) {
                    suppressItemClickRef.current = false;
                    return;
                  }
                  if (pointerDraggingRef.current) return;
                  onActiveSegmentChange(segment.id);
                  onSeek(segment.start);
                }}
              >
                <div className="slice-editor-copy-item-head">
                  {canDragSort ? (
                    <button
                      type="button"
                      className="slice-editor-copy-drag"
                      title="拖动排序"
                      aria-label="拖动排序"
                      onPointerDown={handleDragHandlePointerDown(index)}
                      onPointerMove={handleDragHandlePointerMove}
                      onPointerUp={handleDragHandlePointerUp}
                      onPointerCancel={handleDragHandlePointerCancel}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <LuGripVertical size={14} />
                    </button>
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
                      disabled={
                        getSegmentExtendableSeconds(segments, index, 'start', videoDuration) <= 0
                      }
                      title={`向前扩展 ${SEGMENT_EXTEND_STEP_SEC} 秒（单侧最多 +${SEGMENT_EXTEND_MAX_SEC}s，且不超过上一片段结尾）`}
                      onClick={(event) => {
                        event.stopPropagation();
                        onExtendSegment(segment.id, 'start');
                      }}
                    >
                      向前+{SEGMENT_EXTEND_STEP_SEC}s
                    </button>
                    <button
                      type="button"
                      disabled={
                        getSegmentExtendableSeconds(segments, index, 'end', videoDuration) <= 0
                      }
                      title={`向后扩展 ${SEGMENT_EXTEND_STEP_SEC} 秒（单侧最多 +${SEGMENT_EXTEND_MAX_SEC}s，且不超过下一片段开头）`}
                      onClick={(event) => {
                        event.stopPropagation();
                        onExtendSegment(segment.id, 'end');
                      }}
                    >
                      向后+{SEGMENT_EXTEND_STEP_SEC}s
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
            : ''}
        </p>
      ) : null}
    </div>
  );
};

export default SelectedCopyPanel;
