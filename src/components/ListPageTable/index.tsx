import { Table } from 'antd';
import type { TableProps } from 'antd';

import { useListTableScrollY } from '~/hooks/useListTableScrollY';

export type ListPageTableProps<T extends object> = Omit<TableProps<T>, 'scroll'> & {
  scrollX?: number | string;
  scroll?: TableProps<T>['scroll'];
};

function ListPageTable<T extends object>({
  scrollX,
  scroll,
  className,
  loading,
  dataSource,
  pagination,
  ...rest
}: ListPageTableProps<T>) {
  const paginationKey =
    pagination === false
      ? false
      : typeof pagination === 'object'
        ? pagination.current ?? pagination.pageSize ?? pagination.total
        : pagination;

  const { wrapRef, scrollY } = useListTableScrollY([
    loading,
    dataSource?.length,
    paginationKey,
  ]);

  return (
    <div ref={wrapRef} className="list-page__table-wrap">
      <Table<T>
        {...rest}
        loading={loading}
        dataSource={dataSource}
        pagination={pagination}
        className={['list-page__table', className].filter(Boolean).join(' ')}
        scroll={{
          ...scroll,
          x: scrollX ?? scroll?.x,
          y: scrollY ?? scroll?.y,
        }}
      />
    </div>
  );
}

export default ListPageTable;
