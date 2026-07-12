import { useCallback, useMemo, useState } from 'react';
import type { Dayjs } from 'dayjs';
import { buildDateRange } from '~/utils/date';

export function useListFilters() {
  const [keyword, setKeyword] = useState('');
  const [appliedKeyword, setAppliedKeyword] = useState('');
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);

  const applySearch = useCallback(() => {
    setAppliedKeyword(keyword.trim());
  }, [keyword]);

  const handleDateChange = useCallback((value: [Dayjs | null, Dayjs | null] | null) => {
    setDateRange(value);
  }, []);

  const dateFilters = useMemo(() => buildDateRange(dateRange), [dateRange]);

  return {
    keyword,
    setKeyword,
    appliedKeyword,
    applySearch,
    dateRange,
    handleDateChange,
    dateFilters,
  };
}
