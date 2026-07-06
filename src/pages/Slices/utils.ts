import type { Dayjs } from 'dayjs';

export function buildDateRange(dateRange: [Dayjs | null, Dayjs | null] | null) {
  if (!dateRange?.[0]) {
    return { date: undefined, dateEnd: undefined };
  }

  return {
    date: dateRange[0].format('YYYY-MM-DD'),
    dateEnd: (dateRange[1] ?? dateRange[0]).format('YYYY-MM-DD'),
  };
}
