import { useState, useRef, useCallback, useEffect, type FC, useMemo } from 'react';
import './index.less';

export interface TimeRange {
  id: string;
  start: number;
  end: number;
}

export interface VideoTimelineProps {
  duration: number;
  currentTime: number;
  selectedRanges: TimeRange[];
  maxTotalDuration?: number; // 选中总时长上限（秒）
  zoomLevel?: number;
  onZoomLevelChange?: (level: number) => void;
  activeRangeId?: string | null;
  onActiveRangeChange?: (id: string | null) => void;
  onTimeChange: (time: number) => void;
  onRangeSelect: (range: TimeRange) => void;
  onRangeDelete: (id: string) => void;
  onRangeUpdate?: (range: TimeRange) => void;
}

function formatTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function formatTimeMs(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
  }
  return `${mins}:${String(secs).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
}

const MIN_TICK_SPACING_PX = 50;

type RangeSegmentType = 'core' | 'added' | 'removed';

interface RangeSegment {
  type: RangeSegmentType;
  start: number;
  end: number;
}

function buildRangeVisual(
  original: TimeRange,
  preview?: { start: number; end: number } | null
): { containerStart: number; containerEnd: number; previewStart: number; previewEnd: number; segments: RangeSegment[] } {
  if (!preview) {
    return {
      containerStart: original.start,
      containerEnd: original.end,
      previewStart: original.start,
      previewEnd: original.end,
      segments: [{ type: 'core', start: original.start, end: original.end }],
    };
  }

  const { start: oStart, end: oEnd } = original;
  const { start: pStart, end: pEnd } = preview;
  const segments: RangeSegment[] = [];

  if (pStart > oStart) {
    segments.push({ type: 'removed', start: oStart, end: pStart });
  }
  if (pEnd < oEnd) {
    segments.push({ type: 'removed', start: pEnd, end: oEnd });
  }

  const coreStart = Math.max(oStart, pStart);
  const coreEnd = Math.min(oEnd, pEnd);
  if (coreEnd > coreStart) {
    segments.push({ type: 'core', start: coreStart, end: coreEnd });
  }

  if (pStart < oStart) {
    segments.push({ type: 'added', start: pStart, end: oStart });
  }
  if (pEnd > oEnd) {
    segments.push({ type: 'added', start: oEnd, end: pEnd });
  }

  return {
    containerStart: Math.min(oStart, pStart),
    containerEnd: Math.max(oEnd, pEnd),
    previewStart: pStart,
    previewEnd: pEnd,
    segments,
  };
}

interface Tick {
  time: number;
  isMajor: boolean;
  label: string;
  isSub?: boolean;
}

function getTickConfig(duration: number, scale: number, wrapperWidth: number) {
  if (!Number.isFinite(duration) || duration <= 0 || !Number.isFinite(scale) || scale <= 0) {
    return { tickInterval: 1, subInterval: 0 };
  }

  const intervals = [0.5, 1, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600];
  const idealInterval = MIN_TICK_SPACING_PX / scale;
  let tickInterval = intervals[intervals.length - 1]!;
  for (const interval of intervals) {
    if (interval >= idealInterval) {
      tickInterval = interval;
      break;
    }
  }

  // 根据视频时长动态调整：确保视野内（约1200px）主刻度数量在 8~40 之间
  const visibleTime = 1200 / scale;
  const maxVisibleTicks = 40;
  const minVisibleTicks = 8;
  while (visibleTime / tickInterval > maxVisibleTicks) {
    const idx = intervals.indexOf(tickInterval);
    if (idx < 0 || idx >= intervals.length - 1) break;
    tickInterval = intervals[idx + 1]!;
  }
  // 如果视野内刻度太少（放大时），允许使用更小的间隔
  while (visibleTime / tickInterval < minVisibleTicks && tickInterval > 0.05) {
    const idx = intervals.indexOf(tickInterval);
    if (idx <= 0) break;
    tickInterval = intervals[idx - 1]!;
  }

  const subDivisions: Record<number, number> = {
    0.2: 0.05,
    0.5: 0.1,
    1: 0.2,
    5: 1,
    10: 1,
    30: 5,
    60: 10,
    300: 60,
    600: 60,
    1800: 300,
    3600: 600,
  };

  let subInterval = 0;
  if (tickInterval >= 0.2 && scale >= 10) {
    subInterval = subDivisions[tickInterval] || 0;
  }

  return { tickInterval, subInterval };
}

function generateVisibleTicks(
  duration: number,
  tickInterval: number,
  subInterval: number,
  safeScale: number,
  scrollLeft: number,
  wrapperWidth: number
): Tick[] {
  if (!Number.isFinite(duration) || duration <= 0 || tickInterval <= 0) {
    return [];
  }

  const buffer = 100; // 像素缓冲区
  const startTime = Math.max(0, (scrollLeft - buffer) / safeScale);
  const endTime = Math.min(duration, (scrollLeft + wrapperWidth + buffer) / safeScale);

  const startMajor = Math.floor(startTime / tickInterval) * tickInterval;
  const ticks: Tick[] = [];

  // 当刻度像素间隔太小时，降低标签显示频率，防止重叠
  const pixelInterval = tickInterval * safeScale;
  const labelStep = pixelInterval < 40 ? Math.ceil(40 / pixelInterval) : 1;

  let tickIndex = 0;
  for (let t = startMajor; t <= endTime + tickInterval; t += tickInterval) {
    if (t < 0 || t > duration) {
      tickIndex++;
      continue;
    }

    const time = Math.round(t * 10) / 10;
    const isMajor = tickInterval < 60 ? Math.abs(time % 60) < 0.01 : true;
    const showLabel = tickIndex % labelStep === 0;
    ticks.push({ time, isMajor, label: showLabel ? formatTime(time) : '' });

    // 插入次级刻度
    if (subInterval > 0) {
      let subTime = time + subInterval;
      const nextMajor = time + tickInterval;
      while (subTime < nextMajor - 0.001 && subTime <= duration) {
        ticks.push({
          time: Math.round(subTime * 10) / 10,
          isMajor: false,
          label: '',
          isSub: true,
        });
        subTime += subInterval;
      }
    }

    tickIndex++;
  }

  // 如果终点 duration 不在已有刻度中，且可见，补一个终点刻度（始终显示标签）
  const hasDurationTick = ticks.some((t) => Math.abs(t.time - duration) < 0.01);
  if (!hasDurationTick && duration > startTime && duration <= endTime + tickInterval) {
    const time = Math.round(duration * 10) / 10;
    // 如果终点和最近的有标签刻度距离太近，清空那个刻度的标签避免重叠
    const nearestLabeledIndex = ticks.findIndex(
      (t) => t.label && Math.abs(t.time - duration) * safeScale < 50
    );
    if (nearestLabeledIndex >= 0) {
      ticks[nearestLabeledIndex]!.label = '';
    }
    ticks.push({ time, isMajor: true, label: formatTime(time) });
  }

  return ticks;
}

const VideoTimeline: FC<VideoTimelineProps> = ({
  duration,
  currentTime,
  selectedRanges,
  maxTotalDuration,
  zoomLevel: zoomLevelProp,
  onZoomLevelChange,
  activeRangeId: activeRangeIdProp,
  onActiveRangeChange,
  onTimeChange,
  onRangeSelect,
  onRangeDelete,
  onRangeUpdate,
}) => {
  const [internalZoomLevel, setInternalZoomLevel] = useState(1);
  const isZoomControlled = zoomLevelProp !== undefined && onZoomLevelChange !== undefined;
  const zoomLevel = isZoomControlled ? zoomLevelProp : internalZoomLevel;

  const setZoomLevel = useCallback(
    (value: number | ((prev: number) => number)) => {
      const prev = isZoomControlled ? zoomLevelProp! : internalZoomLevel;
      const next = typeof value === 'function' ? value(prev) : value;

      if (isZoomControlled) {
        onZoomLevelChange!(next);
      } else {
        setInternalZoomLevel(next);
      }
    },
    [internalZoomLevel, isZoomControlled, onZoomLevelChange, zoomLevelProp]
  );

  const [wrapperWidth, setWrapperWidth] = useState(1200);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [dragEnd, setDragEnd] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasDragged, setHasDragged] = useState(false);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [resizingId, setResizingId] = useState<string | null>(null);
  const [internalActiveRangeId, setInternalActiveRangeId] = useState<string | null>(null);
  const isActiveControlled = activeRangeIdProp !== undefined && onActiveRangeChange !== undefined;
  const activeRangeId = isActiveControlled ? activeRangeIdProp! : internalActiveRangeId;

  const setActiveRangeId = useCallback(
    (value: string | null | ((prev: string | null) => string | null)) => {
      const prev = isActiveControlled ? activeRangeIdProp! : internalActiveRangeId;
      const next = typeof value === 'function' ? value(prev) : value;

      if (isActiveControlled) {
        onActiveRangeChange!(next);
      } else {
        setInternalActiveRangeId(next);
      }
    },
    [activeRangeIdProp, internalActiveRangeId, isActiveControlled, onActiveRangeChange]
  );

  const [resizeEdge, setResizeEdge] = useState<'start' | 'end' | null>(null);
  const [resizePreview, setResizePreview] = useState<{ id: string; start: number; end: number } | null>(null);

  // 监听 wrapper 宽度变化，动态计算 baseScale
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWrapperWidth(entry.contentRect.width);
      }
    });

    observer.observe(wrapper);
    return () => observer.disconnect();
  }, []);

  // baseScale = 1x 时每秒对应像素数，使时间轴刚好占满 wrapper 宽度
  const baseScale = Number.isFinite(duration) && duration > 0 && wrapperWidth > 0
    ? wrapperWidth / duration
    : 50;
  const safeScale = baseScale * zoomLevel;

  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const dragStartX = useRef(0);
  const dragStartY = useRef(0);
  const scrollRafRef = useRef<number>(0);

  const timelineWidth = Number.isFinite(duration) && Number.isFinite(safeScale) ? Math.max(duration * safeScale, 0) : 0;

  const { tickInterval, subInterval } = useMemo(
    () => getTickConfig(duration, safeScale, wrapperWidth),
    [duration, safeScale, wrapperWidth]
  );

  // 监听滚动，只渲染视野内刻度
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const handleScroll = () => {
      if (scrollRafRef.current) return;
      scrollRafRef.current = requestAnimationFrame(() => {
        setScrollOffset(wrapper.scrollLeft);
        scrollRafRef.current = 0;
      });
    };

    wrapper.addEventListener('scroll', handleScroll);
    return () => {
      wrapper.removeEventListener('scroll', handleScroll);
      if (scrollRafRef.current) {
        cancelAnimationFrame(scrollRafRef.current);
      }
    };
  }, []);

  const ticks: Tick[] = useMemo(() => {
    const wrapper = wrapperRef.current;
    const wrapperWidth = wrapper?.clientWidth || 0;
    return generateVisibleTicks(
      duration,
      tickInterval,
      subInterval,
      safeScale,
      scrollOffset,
      wrapperWidth
    );
  }, [duration, tickInterval, subInterval, safeScale, scrollOffset]);

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  const getTimeFromX = useCallback(
    (clientX: number): number => {
      if (!contentRef.current) return 0;
      const rect = contentRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      let time = x / safeScale;
      time = Math.max(0, Math.min(time, duration));
      return Math.round(time * 100) / 100;
    },
    [safeScale, duration]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      if ((e.target as HTMLElement).closest('.timeline-range-delete')) return;
      if ((e.target as HTMLElement).closest('.timeline-range-handle')) return;
      if ((e.target as HTMLElement).closest('.timeline-range')) return;

      const time = getTimeFromX(e.clientX);
      dragStartX.current = e.clientX;
      dragStartY.current = e.clientY;
      setIsDragging(true);
      setHasDragged(false);
      setDragStart(time);
      setDragEnd(time);
    },
    [getTimeFromX]
  );

  useEffect(() => {
    if (activeRangeId && !selectedRanges.some((range) => range.id === activeRangeId)) {
      setActiveRangeId(null);
    }
  }, [activeRangeId, selectedRanges, setActiveRangeId]);

  const handleRangeClick = useCallback(
    (range: TimeRange) => {
      setActiveRangeId(range.id);
      onTimeChange(range.start);
    },
    [onTimeChange, setActiveRangeId]
  );

  const handleRangeDeleteClick = useCallback(
    (rangeId: string) => {
      if (activeRangeId === rangeId) {
        setActiveRangeId(null);
      }
      onRangeDelete(rangeId);
    },
    [activeRangeId, onRangeDelete, setActiveRangeId]
  );

  const handleResizeStart = useCallback(
    (e: React.MouseEvent, id: string, edge: 'start' | 'end') => {
      e.stopPropagation();
      if (e.button !== 0) return;
      const range = selectedRanges.find((r) => r.id === id);
      if (!range) return;

      setActiveRangeId(id);
      setResizingId(id);
      setResizeEdge(edge);
      setResizePreview({ id, start: range.start, end: range.end });
      dragStartX.current = e.clientX;
      dragStartY.current = e.clientY;
    },
    [selectedRanges]
  );

  const checkOverlap = useCallback(
    (start: number, end: number): boolean => {
      return selectedRanges.some((r) => start < r.end && end > r.start);
    },
    [selectedRanges]
  );

  const getTotalSelectedDuration = useCallback((): number => {
    return selectedRanges.reduce((sum, r) => sum + (r.end - r.start), 0);
  }, [selectedRanges]);

  const checkMaxDuration = useCallback(
    (additionalDuration: number): boolean => {
      if (!maxTotalDuration || maxTotalDuration <= 0) return true;
      const currentTotal = getTotalSelectedDuration();
      return currentTotal + additionalDuration <= maxTotalDuration;
    },
    [maxTotalDuration, getTotalSelectedDuration]
  );

  const handleMouseUp = useCallback(() => {
    // 处理 resize 结束
    if (resizingId && resizePreview && resizeEdge && onRangeUpdate) {
      const otherRanges = selectedRanges.filter((r) => r.id !== resizingId);
      const hasOverlap = otherRanges.some(
        (r) => resizePreview.start < r.end && resizePreview.end > r.start
      );

      const originalRange = selectedRanges.find((r) => r.id === resizingId);
      const originalDuration = originalRange ? originalRange.end - originalRange.start : 0;
      const newDuration = resizePreview.end - resizePreview.start;
      const additionalDuration = newDuration - originalDuration;

      if (hasOverlap) {
        setErrorMessage('调整后时间段与已选区域重叠，已恢复原始位置');
      } else if (!checkMaxDuration(additionalDuration)) {
        setErrorMessage(`选中总时长不能超过 ${formatTime(maxTotalDuration || 0)}`);
      } else if (resizePreview.end - resizePreview.start >= 0.5) {
        onRangeUpdate({
          id: resizingId,
          start: Math.round(resizePreview.start * 100) / 100,
          end: Math.round(resizePreview.end * 100) / 100,
        });
        onTimeChange(resizePreview.start);
      }

      setResizingId(null);
      setResizeEdge(null);
      setResizePreview(null);
      return;
    }

    if (!isDragging) return;

    if (hasDragged && dragStart !== null && dragEnd !== null) {
      const start = Math.min(dragStart, dragEnd);
      const end = Math.max(dragStart, dragEnd);

      if (end - start >= 0.5) {
        if (checkOverlap(start, end)) {
          setErrorMessage('该时间段与已选区域重叠，请重新选择');
        } else if (!checkMaxDuration(end - start)) {
          setErrorMessage(`选中总时长不能超过 ${formatTime(maxTotalDuration || 0)}`);
        } else {
          const newRangeId = `range-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
          onRangeSelect({
            id: newRangeId,
            start: Math.round(start * 100) / 100,
            end: Math.round(end * 100) / 100,
          });
          setActiveRangeId(newRangeId);
          onTimeChange(start);
        }
      }
    } else if (!hasDragged && dragStart !== null) {
      setActiveRangeId(null);
      onTimeChange(dragStart);
    }

    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
    setHasDragged(false);
  }, [
    isDragging,
    hasDragged,
    dragStart,
    dragEnd,
    checkOverlap,
    checkMaxDuration,
    maxTotalDuration,
    onRangeSelect,
    onTimeChange,
    resizingId,
    resizeEdge,
    resizePreview,
    onRangeUpdate,
    selectedRanges,
    setActiveRangeId,
  ]);

  useEffect(() => {
    // resize 模式下的全局鼠标移动
    if (resizingId && resizeEdge && resizePreview) {
      const handleGlobalResizeMove = (e: MouseEvent) => {
        const time = getTimeFromX(e.clientX);
        setResizePreview((prev) => {
          if (!prev) return null;
          if (resizeEdge === 'start') {
            return { ...prev, start: Math.min(time, prev.end - 0.5) };
          } else {
            return { ...prev, end: Math.max(time, prev.start + 0.5) };
          }
        });
      };

      const handleGlobalResizeUp = () => {
        handleMouseUp();
      };

      document.addEventListener('mousemove', handleGlobalResizeMove);
      document.addEventListener('mouseup', handleGlobalResizeUp);

      return () => {
        document.removeEventListener('mousemove', handleGlobalResizeMove);
        document.removeEventListener('mouseup', handleGlobalResizeUp);
      };
    }

    if (!isDragging) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      const dist = Math.sqrt(
        Math.pow(e.clientX - dragStartX.current, 2) + Math.pow(e.clientY - dragStartY.current, 2)
      );
      if (dist > 3) {
        setHasDragged(true);
      }
      const time = getTimeFromX(e.clientX);
      setDragEnd(time);
    };

    const handleGlobalMouseUp = () => {
      handleMouseUp();
    };

    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging, getTimeFromX, handleMouseUp, resizingId, resizeEdge, resizePreview]);

  // 缩放时自动将标尺保持在视野中央
  useEffect(() => {
    if (!wrapperRef.current || !contentRef.current) return;

    const wrapper = wrapperRef.current;
    const playheadLeft = currentTime * safeScale;
    const wrapperWidth = wrapper.clientWidth;
    const contentWidth = contentRef.current.clientWidth;

    // 确保 scrollLeft 不超出内容范围
    const maxScroll = Math.max(0, contentWidth - wrapperWidth);
    let targetScroll = wrapper.scrollLeft;

    // 如果标尺在视野外，将其滚动到中央
    if (playheadLeft < targetScroll || playheadLeft > targetScroll + wrapperWidth) {
      targetScroll = Math.max(0, Math.min(maxScroll, playheadLeft - wrapperWidth / 2));
    }

    // 如果内容比容器窄，滚动到开头
    if (contentWidth <= wrapperWidth) {
      targetScroll = 0;
    }

    wrapper.scrollLeft = targetScroll;
  }, [safeScale, currentTime]);

  // Ctrl+滚轮切换 zoomLevel（1x~6x）
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        if (e.deltaY > 0) {
          setZoomLevel((prev) => Math.max(1, prev - 1));
        } else {
          setZoomLevel((prev) => Math.min(10, prev + 1));
        }
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleWheel);
    };
  }, []);

  const selectionStart = dragStart !== null && dragEnd !== null ? Math.min(dragStart, dragEnd) : null;
  const selectionEnd = dragStart !== null && dragEnd !== null ? Math.max(dragStart, dragEnd) : null;
  const isInteracting = Boolean(resizingId) || isDragging;

  const rangeIndexMap = useMemo(() => {
    return new Map(selectedRanges.map((range, index) => [range.id, index + 1]));
  }, [selectedRanges]);

  useEffect(() => {
    if (!isInteracting) return;

    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    return () => {
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
    };
  }, [isInteracting]);

  return (
    <div
      className={`video-timeline${resizingId ? ' is-resizing' : ''}${isDragging ? ' is-selecting' : ''}`}
      ref={containerRef}
    >
      {errorMessage && <div className="timeline-error">{errorMessage}</div>}
      <div className={`timeline-wrapper ${zoomLevel > 1 ? 'has-scroll' : ''}`} ref={wrapperRef}>
        <div
          className="timeline-content"
          ref={contentRef}
          style={{ width: timelineWidth }}
          onMouseDown={handleMouseDown}
        >
          <div className="timeline-ruler">
            {ticks.map((tick) => {
              const tickLeft = tick.time * safeScale;
              const isNearEnd = tickLeft + 40 > scrollOffset + wrapperWidth;
              return (
                <div
                  key={tick.time}
                  className={`timeline-tick ${tick.isMajor ? 'major' : ''} ${tick.isSub ? 'sub' : ''} ${isNearEnd ? 'align-left' : ''}`}
                  style={{ left: tickLeft }}
                >
                  {!tick.isSub && <span className="timeline-tick-label">{tick.label}</span>}
                  <div className="timeline-tick-line" />
                </div>
              );
            })}
          </div>

          <div className="timeline-track" />

          <div className="timeline-overlays">
            {selectedRanges.map((range) => {
              const isResizing = resizingId === range.id;
              const preview = isResizing && resizePreview ? resizePreview : null;
              const visual = buildRangeVisual(range, preview);
              const { containerStart, containerEnd, previewStart, previewEnd, segments } = visual;
              const containerWidth = Math.max((containerEnd - containerStart) * safeScale, 4);
              const previewOffset = (previewStart - containerStart) * safeScale;
              const previewWidth = Math.max((previewEnd - previewStart) * safeScale, 4);

              const isActive = activeRangeId === range.id;

              return (
                <div
                  key={range.id}
                  className={`timeline-range ${isResizing ? 'resizing' : ''}${isActive ? ' active' : ''}`}
                  style={{
                    left: containerStart * safeScale,
                    width: containerWidth,
                  }}
                  title={`片段${rangeIndexMap.get(range.id) ?? ''} · ${formatTime(previewStart)} - ${formatTime(previewEnd)} · 点击从该区域开始播放`}
                  onClick={() => handleRangeClick(range)}
                >
                  <div className="timeline-range-segments" aria-hidden="true">
                    {segments.map((segment) => (
                      <div
                        key={`${segment.type}-${segment.start}-${segment.end}`}
                        className={`timeline-range-segment timeline-range-segment_${segment.type}`}
                        style={{
                          left: (segment.start - containerStart) * safeScale,
                          width: Math.max((segment.end - segment.start) * safeScale, 1),
                        }}
                      />
                    ))}
                  </div>

                  <div
                    className="timeline-range-body"
                    style={{
                      left: previewOffset,
                      width: previewWidth,
                    }}
                  >
                    <div
                      className="timeline-range-handle left"
                      onMouseDown={(e) => handleResizeStart(e, range.id, 'start')}
                      title="拖动调整起始时间"
                    />
                    <span className="timeline-range-label" aria-hidden="true">
                      片段{rangeIndexMap.get(range.id) ?? ''}
                    </span>
                    <div
                      className="timeline-range-handle right"
                      onMouseDown={(e) => handleResizeStart(e, range.id, 'end')}
                      title="拖动调整结束时间"
                    />
                    <button
                      className="timeline-range-delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRangeDeleteClick(range.id);
                      }}
                      title="删除该时间段"
                    >
                      ×
                    </button>
                  </div>
                </div>
              );
            })}

            {selectionStart !== null && selectionEnd !== null && hasDragged && (
              <div
                className="timeline-selection timeline-selection_added"
                style={{
                  left: selectionStart * safeScale,
                  width: Math.max((selectionEnd - selectionStart) * safeScale, 4),
                }}
              />
            )}
          </div>

          <div className="timeline-playhead" style={{ left: currentTime * safeScale }}>
            <div className="timeline-playhead-triangle" />
            <div className="timeline-playhead-line" />
            <div className="timeline-playhead-time">{formatTimeMs(currentTime)}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoTimeline;
