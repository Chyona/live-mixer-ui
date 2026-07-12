import type { TablePaginationConfig } from 'antd/es/table';

export const DEFAULT_TABLE_PAGINATION: Pick<
  TablePaginationConfig,
  'showSizeChanger' | 'showTotal'
> = {
  showSizeChanger: true,
  showTotal: (count) => `共 ${count} 条`,
};

export function handleTablePaginationChange(
  pagination: TablePaginationConfig,
  setPage: (page: number) => void,
  setPageSize: (pageSize: number) => void,
  currentPageSize: number
) {
  if (pagination.current) {
    setPage(pagination.current);
  }

  if (pagination.pageSize) {
    setPageSize(pagination.pageSize ?? currentPageSize);
  }
}
