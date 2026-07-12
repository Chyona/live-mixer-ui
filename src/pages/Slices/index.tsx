import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, DatePicker, Input, Table } from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import type { Dayjs } from 'dayjs';
import { LuPlay, LuSearch } from 'react-icons/lu';

import { useAppSEO } from '~/hooks/useAppSEO';
import RemarkEditor from '~/components/RemarkEditor';
import { AppError } from '~/services/http';
import {
  fetchSliceList,
  updateSliceName,
  // type SliceAuditStatus,
  type VideoSliceItem,
} from '~/services/slice';
import { formatToDate } from '~/utils/date';
import { showAppError, toast } from '~/utils/toast';
import { formatVideoDuration } from '../SourceVideos/utils';

import { buildDateRange } from './utils';
import SlicePreviewModal from './SlicePreviewModal';
import './index.css';

const SlicesPage = () => {
  useAppSEO({
    title: '切片管理',
    path: '/slices',
    robots: 'noindex, nofollow',
  });

  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [keyword, setKeyword] = useState('');
  const [appliedKeyword, setAppliedKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState<VideoSliceItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [previewSlice, setPreviewSlice] = useState<VideoSliceItem | null>(null);

  const loadList = useCallback(async () => {
    setLoading(true);

    try {
      const { date, dateEnd } = buildDateRange(dateRange);
      const response = await fetchSliceList({
        date,
        dateEnd,
        keyword: appliedKeyword || undefined,
        page,
        pageSize,
      });

      if (response.code !== 0) {
        toast.error(response.message || '加载切片列表失败');
        return;
      }

      setList(response.data.list);
      setTotal(response.data.total);
    } catch (error) {
      if (error instanceof AppError) {
        showAppError(error);
      } else {
        toast.error('加载切片列表失败');
      }
    } finally {
      setLoading(false);
    }
  }, [appliedKeyword, dateRange, page, pageSize]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const applySearch = () => {
    setAppliedKeyword(keyword.trim());
    setPage(1);
  };

  const handleDateChange = (value: [Dayjs | null, Dayjs | null] | null) => {
    setDateRange(value);
    setPage(1);
  };

  const handleNameSave = async (id: string, name: string) => {
    try {
      const response = await updateSliceName(id, name);
      if (response.code !== 0) {
        toast.error(response.message || '切片名称保存失败');
        return;
      }

      setList((prev) =>
        prev.map((item) => (item.id === id ? { ...item, name: response.data.name } : item))
      );
      toast.success('切片名称已保存');
    } catch (error) {
      if (error instanceof AppError) {
        showAppError(error);
      } else {
        toast.error('切片名称保存失败');
      }
    }
  };

  const columns = useMemo<ColumnsType<VideoSliceItem>>(
    () => [
      {
        title: '切片名称',
        dataIndex: 'name',
        key: 'name',
        width: 220,
        render: (name: string, record) => (
          <RemarkEditor
            value={name}
            placeholder="输入切片名称"
            onSave={(value) => handleNameSave(record.id, value)}
          />
        ),
      },
      {
        title: '开始时间',
        dataIndex: 'startTime',
        key: 'startTime',
        width: 100,
        render: (startTime: number) => formatVideoDuration(startTime),
      },
      {
        title: '结束时间',
        dataIndex: 'endTime',
        key: 'endTime',
        width: 100,
        render: (endTime: number) => formatVideoDuration(endTime),
      },
      {
        title: '时长',
        dataIndex: 'duration',
        key: 'duration',
        width: 100,
        render: (duration: number) => formatVideoDuration(duration),
      },
      {
        title: '时间',
        dataIndex: 'date',
        key: 'date',
        width: 120,
        render: (date: string) => formatToDate(date),
      },
      // {
      //   title: '审核',
      //   dataIndex: 'auditStatus',
      //   key: 'auditStatus',
      //   width: 120,
      //   render: (status: SliceAuditStatus) => {
      //     const config = AUDIT_STATUS_MAP[status];
      //     return <Tag color={config.color}>{config.text}</Tag>;
      //   },
      // },
      {
        title: '预览',
        key: 'preview',
        width: 100,
        align: 'center',
        fixed: 'right',
        onHeaderCell: () => ({ className: 'slices-preview-col' }),
        onCell: () => ({ className: 'slices-preview-col' }),
        render: (_, record) => (
          <div className="slices-preview-cell">
            <button
              type="button"
              className="slices-preview-thumb"
              aria-label={`预览${record.name}`}
              onClick={() => setPreviewSlice(record)}
            >
              <LuPlay size={16} />
            </button>
          </div>
        ),
      },
    ],
    []
  );

  const handleTableChange = (pagination: TablePaginationConfig) => {
    if (pagination.current) {
      setPage(pagination.current);
    }
    if (pagination.pageSize) {
      setPageSize(pagination.pageSize);
    }
  };

  return (
    <div className="slices-page">
      <div className="slices-header">
        <h1 className="slices-title">切片管理</h1>
        <p className="slices-desc">查看、编辑与管理直播切片，支持按日期与源视频标题筛选。</p>
      </div>

      <div className="slices-toolbar">
        <div className="slices-toolbar-filters">
          <DatePicker.RangePicker
            className="slices-date-picker"
            value={dateRange}
            allowClear
            placeholder={['开始日期', '结束日期']}
            onChange={handleDateChange}
          />
          <Input
            className="slices-search-input"
            allowClear
            prefix={<LuSearch size={14} />}
            placeholder="标题搜索：源视频名称 / 备注名称（支持 关键词A+关键词B）"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            onPressEnter={applySearch}
          />
          <Button type="primary" onClick={applySearch}>
            搜索
          </Button>
        </div>
      </div>

      <Table<VideoSliceItem>
        className="slices-table"
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={list}
        scroll={{ x: 880 }}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: (count) => `共 ${count} 条`,
        }}
        onChange={handleTableChange}
      />

      <SlicePreviewModal
        slice={previewSlice}
        open={!!previewSlice}
        onClose={() => setPreviewSlice(null)}
      />
    </div>
  );
};

export default SlicesPage;
