import { Modal } from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';
import { LuPause, LuPlay } from 'react-icons/lu';
import StreamVideoPlayer, { type StreamVideoPlayerHandle } from '~/components/StreamVideoPlayer';
import type { SelectedCopySegment } from '../types';
import { formatSliceTime } from '../utils';

interface SegmentPreviewModalProps {
  open: boolean;
  url: string;
  segments: SelectedCopySegment[];
  onClose: () => void;
}

const END_EPS = 0.06;

function getSegmentDuration(segment: SelectedCopySegment) {
  return Math.max(0, segment.end - segment.start);
}

/** 片段列表拼接后的总时长 */
function getComposedTotal(segments: SelectedCopySegment[]) {
  return segments.reduce((sum, segment) => sum + getSegmentDuration(segment), 0);
}

/** 正片时间 → 组合时间轴进度 */
function sourceToComposed(
  segments: SelectedCopySegment[],
  index: number,
  sourceTime: number
) {
  let composed = 0;
  for (let i = 0; i < index; i += 1) {
    const segment = segments[i];
    if (segment) composed += getSegmentDuration(segment);
  }

  const current = segments[index];
  if (!current) return composed;

  const offset = Math.min(Math.max(sourceTime, current.start), current.end) - current.start;
  return composed + Math.max(0, offset);
}

/** 组合时间轴进度 → 正片时间 + 片段下标 */
function composedToSource(segments: SelectedCopySegment[], composedTime: number) {
  let remaining = Math.max(0, composedTime);

  for (let i = 0; i < segments.length; i += 1) {
    const segment = segments[i];
    if (!segment) continue;

    const duration = getSegmentDuration(segment);
    const isLast = i === segments.length - 1;
    if (remaining <= duration || isLast) {
      return {
        index: i,
        sourceTime: segment.start + Math.min(remaining, duration),
      };
    }
    remaining -= duration;
  }

  const lastIndex = Math.max(segments.length - 1, 0);
  const last = segments[lastIndex];
  return {
    index: lastIndex,
    sourceTime: last?.end ?? 0,
  };
}

function formatComposedClock(seconds: number) {
  const safe = Math.max(0, seconds);
  const mins = Math.floor(safe / 60);
  const secs = Math.floor(safe % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function seekVideo(video: HTMLVideoElement, time: number): Promise<void> {
  const target = Math.max(0, time);

  return new Promise((resolve) => {
    if (Math.abs(video.currentTime - target) < 0.04) {
      resolve();
      return;
    }

    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      video.removeEventListener('seeked', onSeeked);
      window.clearTimeout(timer);
      resolve();
    };

    const onSeeked = () => finish();
    const timer = window.setTimeout(finish, 2500);

    video.addEventListener('seeked', onSeeked);
    try {
      video.currentTime = target;
    } catch {
      finish();
    }
  });
}

const SegmentPreviewModal = ({ open, url, segments, onClose }: SegmentPreviewModalProps) => {
  const playerRef = useRef<StreamVideoPlayerHandle>(null);
  const segmentsRef = useRef(segments);
  const indexRef = useRef(0);
  const switchingRef = useRef(false);
  const watchTimerRef = useRef(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playerReady, setPlayerReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [composedCurrent, setComposedCurrent] = useState(0);

  segmentsRef.current = segments;

  const composedTotal = useMemo(() => getComposedTotal(segments), [segments]);

  const stopWatch = () => {
    window.clearInterval(watchTimerRef.current);
    watchTimerRef.current = 0;
  };

  const syncComposedTime = () => {
    const video = playerRef.current?.video;
    if (!video) return;
    setComposedCurrent(
      sourceToComposed(segmentsRef.current, indexRef.current, video.currentTime)
    );
  };

  const tickWatchRef = useRef<() => void>(() => undefined);

  const ensureWatch = () => {
    if (watchTimerRef.current) return;
    watchTimerRef.current = window.setInterval(() => {
      tickWatchRef.current();
    }, 80);
  };

  const playSegmentAt = async (index: number, sourceTime?: number) => {
    const video = playerRef.current?.video;
    const segment = segmentsRef.current[index];
    if (!video || !segment) return;

    ensureWatch();
    switchingRef.current = true;
    indexRef.current = index;
    setCurrentIndex(index);

    const target = sourceTime ?? segment.start;
    video.pause();
    await seekVideo(video, target);

    if (Math.abs(video.currentTime - target) > 0.35) {
      await seekVideo(video, target);
    }

    switchingRef.current = false;
    syncComposedTime();

    try {
      await video.play();
      setIsPlaying(true);
    } catch {
      setIsPlaying(false);
    }
  };

  const advanceOrStop = () => {
    const list = segmentsRef.current;
    const nextIndex = indexRef.current + 1;
    const video = playerRef.current?.video;

    if (nextIndex >= list.length) {
      // 播完只暂停，保留监视器，方便再次播放继续按片段裁切
      video?.pause();
      setIsPlaying(false);
      setComposedCurrent(getComposedTotal(list));
      return;
    }

    void playSegmentAt(nextIndex);
  };

  tickWatchRef.current = () => {
    if (switchingRef.current) return;

    const video = playerRef.current?.video;
    const segment = segmentsRef.current[indexRef.current];
    if (!video || !segment) return;

    syncComposedTime();
    if (video.paused) return;

    const time = video.currentTime;

    if (time < segment.start - 0.2) {
      void playSegmentAt(indexRef.current);
      return;
    }

    if (time >= segment.end - END_EPS) {
      advanceOrStop();
    }
  };

  useEffect(() => {
    if (!open) {
      stopWatch();
      indexRef.current = 0;
      switchingRef.current = false;
      setCurrentIndex(0);
      setPlayerReady(false);
      setIsPlaying(false);
      setComposedCurrent(0);
      return;
    }

    if (!playerReady) return;

    ensureWatch();
    void playSegmentAt(0);

    return () => {
      stopWatch();
    };
  }, [open, playerReady]);

  const handleReady = () => {
    setPlayerReady(true);
  };

  const handleTogglePlay = () => {
    const video = playerRef.current?.video;
    if (!video) return;

    if (video.paused) {
      ensureWatch();
      // 播完停在末尾时，再点播放从头开始
      if (composedCurrent >= composedTotal - 0.05) {
        void playSegmentAt(0);
        return;
      }
      void video
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
      return;
    }

    video.pause();
    setIsPlaying(false);
  };

  const handleSeekComposed = (composedTime: number) => {
    const mapped = composedToSource(segmentsRef.current, composedTime);
    setComposedCurrent(composedTime);
    void playSegmentAt(mapped.index, mapped.sourceTime);
  };

  const currentSegment = segments[currentIndex];

  return (
    <Modal
      open={open}
      title="连续预览"
      width={860}
      footer={null}
      destroyOnClose
      onCancel={onClose}
    >
      <div className="slice-editor-preview-modal">
        <div className="slice-editor-preview-stage">
          <StreamVideoPlayer
            ref={playerRef}
            url={url}
            className="slice-editor-preview-video"
            controls={false}
            showFirstFrame={false}
            onReady={handleReady}
          />
          <div className="slice-editor-preview-controls">
            <button
              type="button"
              className="slice-editor-preview-play"
              onClick={handleTogglePlay}
              aria-label={isPlaying ? '暂停' : '播放'}
            >
              {isPlaying ? <LuPause size={18} /> : <LuPlay size={18} />}
            </button>
            <div className="slice-editor-preview-timeline">
              <input
                type="range"
                min={0}
                max={composedTotal || 0}
                step={0.05}
                value={Math.min(composedCurrent, composedTotal)}
                disabled={composedTotal <= 0}
                onChange={(event) => handleSeekComposed(Number(event.target.value))}
                aria-label="组合时间轴"
              />
              <div className="slice-editor-preview-time">
                <span>{formatComposedClock(composedCurrent)}</span>
                <span>/</span>
                <span>{formatComposedClock(composedTotal)}</span>
              </div>
            </div>
          </div>
        </div>
        {currentSegment ? (
          <div className="slice-editor-preview-meta">
            <span>
              正在播放片段 {currentIndex + 1}/{segments.length}
            </span>
            <span>
              源片 {formatSliceTime(currentSegment.start)} - {formatSliceTime(currentSegment.end)}
            </span>
            <p>{currentSegment.text}</p>
          </div>
        ) : null}
      </div>
    </Modal>
  );
};

export default SegmentPreviewModal;
