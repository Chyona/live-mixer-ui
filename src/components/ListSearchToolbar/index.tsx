import type { ReactNode } from 'react';
import { Button, DatePicker, Input } from 'antd';
import type { Dayjs } from 'dayjs';
import { LuSearch } from 'react-icons/lu';

export interface ListSearchField {
  key: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}

interface ListSearchToolbarProps {
  showDateRange?: boolean;
  dateRange?: [Dayjs | null, Dayjs | null] | null;
  onDateChange?: (value: [Dayjs | null, Dayjs | null] | null) => void;
  searches?: ListSearchField[];
  onSearch: () => void;
  extra?: ReactNode;
}

const ListSearchToolbar = ({
  showDateRange = false,
  dateRange,
  onDateChange,
  searches = [],
  onSearch,
  extra,
}: ListSearchToolbarProps) => {
  return (
    <div className="list-page__toolbar-filters">
      {showDateRange ? (
        <DatePicker.RangePicker
          className="list-page__date-picker"
          value={dateRange}
          allowClear
          placeholder={['开始日期', '结束日期']}
          onChange={onDateChange}
        />
      ) : null}

      {searches.map((field) => (
        <Input
          key={field.key}
          className="list-page__search-input"
          allowClear
          prefix={<LuSearch size={14} />}
          placeholder={field.placeholder}
          value={field.value}
          onChange={(event) => field.onChange(event.target.value)}
          onPressEnter={onSearch}
        />
      ))}

      {extra}

      <Button type="primary" onClick={onSearch}>
        搜索
      </Button>
    </div>
  );
};

export default ListSearchToolbar;
