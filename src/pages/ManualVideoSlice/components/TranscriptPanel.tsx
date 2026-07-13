import { useMemo } from 'react';
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
  activeMatchIndex: number;
  matchParagraphIds: string[];
  onSeek: (time: number) => void;
  onSelectSegment: (segment: ReturnType<typeof paragraphToCopySegment>) => void;
}

const TranscriptPanel = ({
  paragraphs,
  keyword,
  onKeywordChange,
  onPrevMatch,
  onNextMatch,
  embedded = false,
  activeParagraphId,
  activeSegmentId,
  activeMatchIndex,
  matchParagraphIds,
  onSeek,
  onSelectSegment,
}: TranscriptPanelProps) => {
  const speakerIds = useMemo(
    () => [...new Set(paragraphs.map((item) => item.speakerId))],
    [paragraphs]
  );

  const handleParagraphClick = (paragraph: TranscriptParagraph) => {
    const range = getParagraphRange(paragraph);
    onSeek(range.start);
  };

  const handleParagraphDoubleClick = (paragraph: TranscriptParagraph) => {
    const copySegment = paragraphToCopySegment(paragraph);
    if (copySegment) {
      onSelectSegment(copySegment);
    }
  };

  const handleTextSelection = (
    event: React.MouseEvent<HTMLDivElement>,
    paragraph: TranscriptParagraph
  ) => {
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
      <div className="slice-editor-transcript-head">
        <div className="slice-editor-panel-title">文案分段</div>
        <KeywordSearchBar
          value={keyword}
          onChange={onKeywordChange}
          matchCount={matchParagraphIds.length}
          activeMatchIndex={activeMatchIndex}
          onPrevMatch={onPrevMatch}
          onNextMatch={onNextMatch}
        />
      </div>
      <div className="slice-editor-transcript-body">
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
              onDoubleClick={() => handleParagraphDoubleClick(paragraph)}
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
                onMouseUp={(event) => handleTextSelection(event, paragraph)}
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
                      className={activeSegmentId === segment.id ? 'segment-active' : ''}
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
