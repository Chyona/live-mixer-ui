import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, DatePicker, Input, Space, Table } from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import type { Dayjs } from 'dayjs';
import { LuCirclePlay, LuSearch, LuTextSelect } from 'react-icons/lu';

import EllipsisTooltip from '~/components/EllipsisTooltip';
import RemarkEditor from '~/components/RemarkEditor';
import { useAppSEO } from '~/hooks/useAppSEO';
import { AppError } from '~/services/http';
import {
  fetchSliceProjectList,
  updateSliceProjectName,
  type SliceProject,
} from '~/services/sliceProject';
import { formatToDateTime } from '~/utils/date';
import { showAppError, toast } from '~/utils/toast';
import { buildSliceProjectEditLink } from '../SourceVideos/utils';

import { buildDateRange } from './utils';
import './index.css';

const SlicesPage = () => {
  const navigate = useNavigate();

  useAppSEO({
    title: '项目管理',
    path: '/slices',
    robots: 'noindex, nofollow',
  });

  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [keyword, setKeyword] = useState('');
  const [appliedKeyword, setAppliedKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState<SliceProject[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const loadList = useCallback(async () => {
    setLoading(true);

    try {
      const { date, dateEnd } = buildDateRange(dateRange);
      const response = await fetchSliceProjectList({
        date,
        dateEnd,
        keyword: appliedKeyword || undefined,
        page,
        pageSize,
      });

      if (response.code !== 0) {
        toast.notify.error(response.message || '加载剪辑项目失败');
        return;
      }

      setList(response.data.list);
      setTotal(response.data.total);
    } catch (error) {
      if (error instanceof AppError) {
        showAppError(error);
      } else {
        toast.notify.error('加载剪辑项目失败');
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

  const handleProjectNameSave = async (id: string, projectName: string) => {
    try {
      const response = await updateSliceProjectName(id, projectName);
      if (response.code !== 0) {
        toast.notify.error(response.message || '项目名称保存失败');
        return;
      }

      setList((prev) =>
        prev.map((item) => (item.id === id ? { ...item, projectName: response.data.projectName } : item))
      );
      toast.notify.success('项目名称已保存');
    } catch (error) {
      if (error instanceof AppError) {
        showAppError(error);
      } else {
        toast.notify.error('项目名称保存失败');
      }
    }
  };

  const columns = useMemo<ColumnsType<SliceProject>>(
    () => [
      {
        title: '项目名称',
        dataIndex: 'projectName',
        key: 'projectName',
        render: (projectName: string, record) => (
          <RemarkEditor
            value={projectName}
            placeholder="输入项目名称"
            onSave={(value) => handleProjectNameSave(record.id, value)}
          />
        ),
      },
      {
        title: '源视频名称',
        dataIndex: 'sourceVideoName',
        key: 'sourceVideoName',
        ellipsis: true,
        render: (name: string) => <EllipsisTooltip text={name || '-'} className="slices-cell-ellipsis" />,
      },
      {
        title: '备注名称',
        dataIndex: 'remarkName',
        key: 'remarkName',
        ellipsis: true,
        render: (name: string) => <EllipsisTooltip text={name || '-'} className="slices-cell-ellipsis" />,
      },
      {
        title: '片段数',
        dataIndex: 'segmentCount',
        key: 'segmentCount',
        width: 100,
        align: 'center',
      },
      {
        title: '更新时间',
        dataIndex: 'updatedAt',
        key: 'updatedAt',
        width: 160,
        render: (value: string) => formatToDateTime(value),
      },
      {
        title: '操作',
        key: 'actions',
        width: 120,
        fixed: 'right',
        render: (_, record) => (
          <Space size={8}>
            <Button
              type="link"
              size="small"
              className="slices-action-btn"
              icon={<LuTextSelect size={14} />}
              onClick={() =>
                navigate(buildSliceProjectEditLink(record.sourceVideoId, record.projectSource), {
                  state: { from: 'slices' },
                })
              }
            >
              编辑项目
            </Button>
          </Space>
        ),
      },
    ],
    [navigate]
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
        <h1 className="slices-title">项目管理</h1>
        <p className="slices-desc">
          管理每个源视频对应的剪辑项目，单视频对应一个可二次编辑的切片项目。
        </p>
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
            placeholder="标题搜索：项目名称 / 源视频名称 / 备注名称（支持 关键词A+关键词B）"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            onPressEnter={applySearch}
          />
          <Button type="primary" onClick={applySearch}>
            搜索
          </Button>
        </div>
      </div>

      <Table<SliceProject>
        className="slices-table"
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={list}
        scroll={{ x: 1100 }}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: (count) => `共 ${count} 条`,
        }}
        onChange={handleTableChange}
      />
    </div>
  );
};

export default SlicesPage;
