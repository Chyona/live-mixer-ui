import { Switch, Tooltip } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { TranscriptParagraph } from '../types';
import KeywordSearchBar from './KeywordSearchBar';
import {
  getParagraphRange,
  getParagraphText,
  getSpeakerColor,
  highlightKeyword,
  paragraphSelectionToCopySegment,
  paragraphToCopySegment,
  scrollFollowElement,
  type TranscriptHighlight,
} from '../utils';

interface TranscriptPanelProps {
  paragraphs: TranscriptParagraph[];
  keyword: string;
  onKeywordChange: (value: string) => void;
  onPrevMatch: () => void;
  onNextMatch: () => void;
  embedded?: boolean;
  activeParagraphId: string | null;
  transcriptHighlight: TranscriptHighlight | null;
  isVideoPlaying?: boolean;
  activeMatchIndex: number;
  matchParagraphIds: string[];
  onSeek: (time: number) => void;
  onSelectSegment: (segment: ReturnType<typeof paragraphToCopySegment>) => void;
}

const TRANSCRIPT_AUTO_SCROLL_KEY = 'manual-slice-transcript-auto-scroll';

const TranscriptPanel = ({
  paragraphs,
  keyword,
  onKeywordChange,
  onPrevMatch,
  onNextMatch,
  embedded = false,
  activeParagraphId,
  transcriptHighlight,
  isVideoPlaying = false,
  activeMatchIndex,
  matchParagraphIds,
  onSeek,
  onSelectSegment,
}: TranscriptPanelProps) => {
  const transcriptBodyRef = useRef<HTMLDivElement>(null);
  const lastAutoScrolledTargetRef = useRef<string | null>(null);
  const autoScrollPauseTimerRef = useRef<number>(0);
  const pendingSeekTimerRef = useRef<number>(0);
  const suppressNextClickSeekRef = useRef(false);
  const [autoScrollPaused, setAutoScrollPaused] = useState(false);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(() => {
    return localStorage.getItem(TRANSCRIPT_AUTO_SCROLL_KEY) !== 'false';
  });

  const speakerIds = useMemo(
    () => [...new Set(paragraphs.map((item) => item.speakerId))],
    [paragraphs]
  );

  const pauseAutoScroll = useCallback(() => {
    if (!autoScrollEnabled) return;

    setAutoScrollPaused(true);
    window.clearTimeout(autoScrollPauseTimerRef.current);
    autoScrollPauseTimerRef.current = window.setTimeout(() => {
      setAutoScrollPaused(false);
      lastAutoScrolledTargetRef.current = null;
    }, 2500);
  }, [autoScrollEnabled]);

  const handleAutoScrollEnabledChange = (checked: boolean) => {
    setAutoScrollEnabled(checked);
    localStorage.setItem(TRANSCRIPT_AUTO_SCROLL_KEY, String(checked));
    setAutoScrollPaused(false);
    lastAutoScrolledTargetRef.current = null;
  };

  useEffect(() => {
    return () => {
      window.clearTimeout(autoScrollPauseTimerRef.current);
      window.clearTimeout(pendingSeekTimerRef.current);
    };
  }, []);

  const scheduleSeek = useCallback(
    (time: number) => {
      window.clearTimeout(pendingSeekTimerRef.current);
      pendingSeekTimerRef.current = window.setTimeout(() => {
        onSeek(time);
      }, 220);
    },
    [onSeek]
  );

  const cancelPendingSeek = useCallback(() => {
    window.clearTimeout(pendingSeekTimerRef.current);
    pendingSeekTimerRef.current = 0;
  }, []);

  useEffect(() => {
    if (!autoScrollEnabled || autoScrollPaused || !activeParagraphId) return;
    if (transcriptHighlight?.mode !== 'playback') return;
    if (!isVideoPlaying) return;

    const activeSegmentId = transcriptHighlight.segmentIds[0] ?? '';
    const scrollTargetKey = `${activeParagraphId}:${activeSegmentId}`;
    if (lastAutoScrolledTargetRef.current === scrollTargetKey) return;

    const container = transcriptBodyRef.current;
    if (!container) return;

    const segmentNode = activeSegmentId
      ? container.querySelector<HTMLElement>(`[data-segment-id="${activeSegmentId}"]`)
      : null;
    const paragraphNode = container.querySelector<HTMLElement>(
      `[data-paragraph-id="${activeParagraphId}"]`
    );
    const target = segmentNode ?? paragraphNode;
    if (!target) return;

    lastAutoScrolledTargetRef.current = scrollTargetKey;
    scrollFollowElement(container, target);
  }, [
    activeParagraphId,
    autoScrollEnabled,
    autoScrollPaused,
    isVideoPlaying,
    transcriptHighlight,
  ]);

  useEffect(() => {
    lastAutoScrolledTargetRef.current = null;
  }, [paragraphs]);

  const handleParagraphClick = (
    event: React.MouseEvent<HTMLDivElement>,
    paragraph: TranscriptParagraph
  ) => {
    // 双击第二次 click / 拖选后的 click 不跳转，避免打断播放
    if (event.detail > 1) return;
    if (suppressNextClickSeekRef.current) {
      suppressNextClickSeekRef.current = false;
      return;
    }

    const range = getParagraphRange(paragraph);
    scheduleSeek(range.start);
  };

  const handleParagraphDoubleClick = (
    event: React.MouseEvent<HTMLDivElement>,
    paragraph: TranscriptParagraph
  ) => {
    event.preventDefault();
    event.stopPropagation();
    cancelPendingSeek();
    suppressNextClickSeekRef.current = false;
    window.getSelection()?.removeAllRanges();

    const copySegment = paragraphToCopySegment(paragraph);
    if (copySegment) {
      onSelectSegment(copySegment);
    }
  };

  const handleTextSelection = (
    event: React.MouseEvent<HTMLDivElement>,
    paragraph: TranscriptParagraph
  ) => {
    if (event.detail >= 2) return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const copySegment = paragraphSelectionToCopySegment(event.currentTarget, paragraph);
    if (copySegment) {
      suppressNextClickSeekRef.current = true;
      cancelPendingSeek();
      onSelectSegment(copySegment);
      selection.removeAllRanges();
    }
  };

  const handleSegmentClick = (event: React.MouseEvent<HTMLSpanElement>, start: number) => {
    event.stopPropagation();
    if (event.detail > 1) return;
    if (suppressNextClickSeekRef.current) {
      suppressNextClickSeekRef.current = false;
      return;
    }
    scheduleSeek(start);
  };

  return (
    <div
      className={
        embedded
          ? 'slice-editor-transcript-section'
          : 'slice-editor-panel slice-editor-panel_transcript'
      }
    >
      <div className="slice-editor-transcript-top">
        <div className="slice-editor-transcript-head">
          <div className="slice-editor-transcript-head-main">
            <div className="slice-editor-panel-title">文案分段</div>
            <Tooltip title="开启后，播放视频时文案列表会自动滚动，将当前朗读段落居中显示">
              <label className="slice-editor-transcript-follow">
                <Switch
                  size="small"
                  checked={autoScrollEnabled}
                  onChange={handleAutoScrollEnabledChange}
                />
                <span>定位跟随</span>
              </label>
            </Tooltip>
          </div>
          <KeywordSearchBar
            value={keyword}
            onChange={onKeywordChange}
            matchCount={matchParagraphIds.length}
            activeMatchIndex={activeMatchIndex}
            onPrevMatch={onPrevMatch}
            onNextMatch={onNextMatch}
          />
        </div>
      </div>
      <div
        ref={transcriptBodyRef}
        className="slice-editor-transcript-body"
        onWheel={pauseAutoScroll}
        onTouchStart={pauseAutoScroll}
        onMouseDown={pauseAutoScroll}
      >
        {paragraphs.map((paragraph) => {
          const color = getSpeakerColor(paragraph.speakerId, speakerIds);
          const isPlaybackParagraph = transcriptHighlight?.paragraphId === paragraph.id;
          const highlightSegmentIds = new Set(transcriptHighlight?.segmentIds ?? []);
          const isKeywordMatch = matchParagraphIds.includes(paragraph.id);
          const keywordMatchIndex = matchParagraphIds.indexOf(paragraph.id);
          const isCurrentKeywordMatch =
            keyword.trim() && isKeywordMatch && keywordMatchIndex === activeMatchIndex;
          const paragraphText = getParagraphText(paragraph);

          const renderParagraphText = () => {
            if (keyword.trim()) {
              return (
                <span
                  dangerouslySetInnerHTML={{
                    __html: highlightKeyword(paragraphText, keyword),
                  }}
                />
              );
            }

            return paragraph.segments.map((segment) => {
              const isPlaybackActive = highlightSegmentIds.has(segment.id);

              return (
                <span
                  key={segment.id}
                  data-segment-id={segment.id}
                  data-start={segment.start}
                  data-end={segment.end}
                  className={[
                    'slice-editor-segment-clause',
                    isPlaybackActive ? 'segment-active' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={(event) => handleSegmentClick(event, segment.start)}
                >
                  {segment.text}
                </span>
              );
            });
          };

          return (
            <div
              key={paragraph.id}
              data-paragraph-id={paragraph.id}
              className={[
                'slice-editor-paragraph',
                isPlaybackParagraph ? 'active' : '',
                isKeywordMatch ? 'matched' : '',
                isCurrentKeywordMatch ? 'matched-current' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={(event) => handleParagraphClick(event, paragraph)}
              onDoubleClick={(event) => handleParagraphDoubleClick(event, paragraph)}
            >
              <div className="slice-editor-paragraph-head">
                <span className="slice-editor-speaker" style={{ color }}>
                  {paragraph.speakerName}
                </span>
                <span className="slice-editor-paragraph-time">
                  {getParagraphRange(paragraph).start.toFixed(1)}s
                </span>
              </div>
              <div
                className="slice-editor-paragraph-text"
                onMouseUp={(event) => {
                  event.stopPropagation();
                  handleTextSelection(event, paragraph);
                }}
              >
                {renderParagraphText()}
              </div>
            </div>
          );
        })}
      </div>
      <p className="slice-editor-transcript-tip">
        单击定位视频，双击选中整段；拖拽选中部分文字可提取对应片段。
      </p>
    </div>
  );
};

export default TranscriptPanel;
