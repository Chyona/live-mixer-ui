import { Input } from 'antd';
import { LuSearch } from 'react-icons/lu';

interface KeywordSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  matchCount: number;
  activeMatchIndex: number;
  onPrevMatch: () => void;
  onNextMatch: () => void;
}

const KeywordSearchBar = ({
  value,
  onChange,
  matchCount,
  activeMatchIndex,
  onPrevMatch,
  onNextMatch,
}: KeywordSearchBarProps) => {
  return (
    <div className="manual-slice-search">
      <div className="manual-slice-search-input-wrap">
        <LuSearch size={16} className="manual-slice-search-icon" />
        <Input
          allowClear
          value={value}
          placeholder="输入关键词快速定位文案"
          onChange={(event) => onChange(event.target.value)}
          onPressEnter={onNextMatch}
        />
      </div>
      {value.trim() && (
        <div className="manual-slice-search-meta">
          <span>
            {matchCount > 0 ? `${activeMatchIndex + 1}/${matchCount}` : '无匹配'}
          </span>
          <button type="button" onClick={onPrevMatch} disabled={matchCount === 0}>
            上一个
          </button>
          <button type="button" onClick={onNextMatch} disabled={matchCount === 0}>
            下一个
          </button>
        </div>
      )}
    </div>
  );
};

export default KeywordSearchBar;
