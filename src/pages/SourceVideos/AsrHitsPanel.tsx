import { highlightListKeywords } from '~/utils/listKeywords';

interface AsrHitsPanelProps {
  hits: string[];
  keywords: string[];
}

const AsrHitsPanel = ({ hits, keywords }: AsrHitsPanelProps) => {
  if (!hits.length) return null;

  return (
    <div className="source-videos-asr-hits">
      {hits.map((sentence, index) => (
        <p
          key={`${index}-${sentence.slice(0, 24)}`}
          className="source-videos-asr-hits__line"
          dangerouslySetInnerHTML={{
            __html: highlightListKeywords(sentence, keywords),
          }}
        />
      ))}
    </div>
  );
};

export default AsrHitsPanel;
