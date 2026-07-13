import { Switch, Tooltip } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { TranscriptParagraph } from '../types';
import KeywordSearchBar from './KeywordSearchBar';
import {
  collectSegmentsFromSelection,
  getParagraphRange,
  getParagraphText,
  getSpeakerColor,
  highlightKeyword,
  paragraphToCopySegment,
  segmentsToCopySegment,
  scrollElementIntoViewPreferUpper,
} from '../utils';

interface TranscriptPanelProps {
  paragraphs: TranscriptParagraph[];
  keyword: string;
  onKeywordChange: (value: string) => void;
  onPrevMatch: () => void;
  onNextMatch: () => void;
  embedded?: boolean;
  activeParagraphId: string | null;
  activeSegmentId: string | null;
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
  activeSegmentId,
  isVideoPlaying = false,
  activeMatchIndex,
  matchParagraphIds,
  onSeek,
  onSelectSegment,
}: TranscriptPanelProps) => {
  const transcriptBodyRef = useRef<HTMLDivElement>(null);
  const lastAutoScrolledParagraphRef = useRef<string | null>(null);
  const autoScrollPauseTimerRef = useRef<number>(0);
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
      lastAutoScrolledParagraphRef.current = null;
    }, 2500);
  }, [autoScrollEnabled]);

  const handleAutoScrollEnabledChange = (checked: boolean) => {
    setAutoScrollEnabled(checked);
    localStorage.setItem(TRANSCRIPT_AUTO_SCROLL_KEY, String(checked));
    setAutoScrollPaused(false);
    lastAutoScrolledParagraphRef.current = null;
  };

  useEffect(() => {
    return () => {
      window.clearTimeout(autoScrollPauseTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!autoScrollEnabled || !isVideoPlaying || autoScrollPaused || !activeParagraphId) return;
    if (lastAutoScrolledParagraphRef.current === activeParagraphId) return;

    const container = transcriptBodyRef.current;
    const node = container?.querySelector<HTMLElement>(
      `[data-paragraph-id="${activeParagraphId}"]`
    );
    if (!container || !node) return;

    lastAutoScrolledParagraphRef.current = activeParagraphId;
    scrollElementIntoViewPreferUpper(container, node);
  }, [activeParagraphId, autoScrollEnabled, autoScrollPaused, isVideoPlaying]);

  useEffect(() => {
    lastAutoScrolledParagraphRef.current = null;
  }, [paragraphs]);

  const handleParagraphClick = (paragraph: TranscriptParagraph) => {
    const range = getParagraphRange(paragraph);
    onSeek(range.start);
  };

  const handleParagraphDoubleClick = (
    event: React.MouseEvent<HTMLDivElement>,
    paragraph: TranscriptParagraph
  ) => {
    event.preventDefault();
    event.stopPropagation();
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

    const segments = collectSegmentsFromSelection(event.currentTarget, selection);
    const copySegment = segmentsToCopySegment(segments, paragraph.speakerId, paragraph.speakerName);
    if (copySegment) {
      onSelectSegment(copySegment);
      selection.removeAllRanges();
    }
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
          const isActiveParagraph = activeParagraphId === paragraph.id;
          const isKeywordMatch = matchParagraphIds.includes(paragraph.id);
          const keywordMatchIndex = matchParagraphIds.indexOf(paragraph.id);
          const isCurrentKeywordMatch =
            keyword.trim() && isKeywordMatch && keywordMatchIndex === activeMatchIndex;
          const paragraphText = getParagraphText(paragraph);

          return (
            <div
              key={paragraph.id}
              data-paragraph-id={paragraph.id}
              className={[
                'slice-editor-paragraph',
                isActiveParagraph ? 'active' : '',
                isKeywordMatch ? 'matched' : '',
                isCurrentKeywordMatch ? 'matched-current' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => handleParagraphClick(paragraph)}
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
                {keyword.trim() ? (
                  <span
                    dangerouslySetInnerHTML={{
                      __html: highlightKeyword(paragraphText, keyword),
                    }}
                  />
                ) : (
                  paragraph.segments.map((segment) => (
                    <span
                      key={segment.id}
                      data-segment-id={segment.id}
                      data-start={segment.start}
                      data-end={segment.end}
                      className={[
                        'slice-editor-segment-clause',
                        activeSegmentId === segment.id ? 'segment-active' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      onClick={(event) => {
                        event.stopPropagation();
                        onSeek(segment.start);
                      }}
                    >
                      {segment.text}
                    </span>
                  ))
                )}
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
