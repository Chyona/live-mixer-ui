import { Modal } from 'antd';
import StreamVideoPlayer, { type StreamVideoPlayerHandle } from '~/components/StreamVideoPlayer';
import type { SelectedCopySegment } from '../types';
import { formatSliceTime } from '../utils';
import { useEffect, useRef, useState } from 'react';

interface SegmentPreviewModalProps {
  open: boolean;
  url: string;
  segments: SelectedCopySegment[];
  onClose: () => void;
}

const SegmentPreviewModal = ({ open, url, segments, onClose }: SegmentPreviewModalProps) => {
  const playerRef = useRef<StreamVideoPlayerHandle>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!open) {
      setCurrentIndex(0);
      return;
    }

    const video = playerRef.current?.video;
    const segment = segments[0];
    if (!video || !segment) return;

    video.currentTime = segment.start;
    void video.play().catch(() => undefined);
  }, [open, segments]);

  useEffect(() => {
    const video = playerRef.current?.video;
    if (!video || !open) return;

    const handleTimeUpdate = () => {
      const segment = segments[currentIndex];
      if (!segment) return;

      if (video.currentTime >= segment.end - 0.05) {
        const nextIndex = currentIndex + 1;
        if (nextIndex >= segments.length) {
          video.pause();
          return;
        }

        const nextSegment = segments[nextIndex];
        if (!nextSegment) {
          video.pause();
          return;
        }

        setCurrentIndex(nextIndex);
        video.currentTime = nextSegment.start;
        void video.play().catch(() => undefined);
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => video.removeEventListener('timeupdate', handleTimeUpdate);
  }, [currentIndex, open, segments]);

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
        <StreamVideoPlayer ref={playerRef} url={url} className="slice-editor-preview-video" />
        {currentSegment && (
          <div className="slice-editor-preview-meta">
            <span>
              正在播放片段 {currentIndex + 1}/{segments.length}
            </span>
            <span>
              {formatSliceTime(currentSegment.start)} - {formatSliceTime(currentSegment.end)}
            </span>
            <p>{currentSegment.text}</p>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default SegmentPreviewModal;
