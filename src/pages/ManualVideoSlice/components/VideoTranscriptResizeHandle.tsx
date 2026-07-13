import { useCallback, useState } from 'react';
import { LuRotateCcw } from 'react-icons/lu';

interface VideoTranscriptResizeHandleProps {
  isCustomized: boolean;
  onResize: (height: number) => void;
  onMeasureStart: () => number;
  onMeasurePanel: () => number;
  onReset: () => void;
  minHeight?: number;
  maxHeightRatio?: number;
}

const VideoTranscriptResizeHandle = ({
  isCustomized,
  onResize,
  onMeasureStart,
  onMeasurePanel,
  onReset,
  minHeight = 120,
  maxHeightRatio = 0.78,
}: VideoTranscriptResizeHandleProps) => {
  const [active, setActive] = useState(false);

  const handleMouseDown = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      event.preventDefault();

      const startY = event.clientY;
      const startHeight = onMeasureStart();
      const panelHeight = onMeasurePanel();
      const maxHeight = panelHeight * maxHeightRatio;

      setActive(true);
      document.body.style.cursor = 'ns-resize';
      document.body.style.userSelect = 'none';

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const nextHeight = Math.min(
          maxHeight,
          Math.max(minHeight, startHeight + moveEvent.clientY - startY)
        );
        onResize(nextHeight);
      };

      const handleMouseUp = () => {
        setActive(false);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [maxHeightRatio, minHeight, onMeasurePanel, onMeasureStart, onResize]
  );

  const handleReset = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onReset();
  };

  const handleDoubleClick = () => {
    onReset();
  };

  return (
    <div
      className={[
        'slice-editor-section-divider',
        'slice-editor-section-divider_resizable',
        active ? 'slice-editor-section-divider_active' : '',
        isCustomized ? 'slice-editor-section-divider_customized' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      role="separator"
      aria-orientation="horizontal"
      aria-label="拖动调整视频区域高度，双击还原"
    >
      <div
        className="slice-editor-section-divider-hit"
        title="拖动调整高度，双击还原"
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
      />
      <div className="slice-editor-section-divider-grip" aria-hidden>
        <span />
        <span />
      </div>
      {isCustomized ? (
        <button
          type="button"
          className="slice-editor-section-divider-reset"
          title="还原高度"
          aria-label="还原高度"
          onClick={handleReset}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <LuRotateCcw size={12} />
        </button>
      ) : null}
    </div>
  );
};

export default VideoTranscriptResizeHandle;
