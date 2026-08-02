import type { LiveAsrSegment } from '~/services/sourceVideo.model';
import { highlightListKeywords } from '~/utils/listKeywords';

interface AsrHitsPanelProps {
  paragraphs: LiveAsrSegment[];
  keywords: string[];
}

const AsrHitsPanel = ({ paragraphs, keywords }: AsrHitsPanelProps) => {
  if (!paragraphs.length) return null;

  return (
    <div className="source-videos-asr-hits">
      {paragraphs.map((paragraph, index) => (
        <p
          key={`${paragraph.start_time}-${paragraph.end_time}-${index}`}
          className="source-videos-asr-hits__line"
          dangerouslySetInnerHTML={{
            __html: highlightListKeywords(paragraph.text, keywords),
          }}
        />
      ))}
    </div>
  );
};

export default AsrHitsPanel;
