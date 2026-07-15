import { useCallback, useMemo, useState } from 'react';
import type { Dayjs } from 'dayjs';
import { buildDateRange } from '~/utils/date';

export function useListFilters(options?: { initialKeyword?: string }) {
  const initialKeyword = options?.initialKeyword?.trim() ?? '';
  const [keyword, setKeyword] = useState(initialKeyword);
  const [appliedKeyword, setAppliedKeyword] = useState(initialKeyword);
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
