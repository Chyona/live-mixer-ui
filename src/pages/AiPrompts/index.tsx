import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Input, Popconfirm, Table } from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { LuPlus, LuSearch, LuTrash2 } from 'react-icons/lu';

import EllipsisTooltip from '~/components/EllipsisTooltip';
import RemarkEditor from '~/components/RemarkEditor';
import { useAppSEO } from '~/hooks/useAppSEO';
import { AppError } from '~/services/http';
import {
  deleteAiPrompt,
  fetchAiPromptList,
  updateAiPromptRemark,
  type AiPrompt,
} from '~/services/aiPrompt';
import { formatToDateTime } from '~/utils/date';
import { showAppError, toast } from '~/utils/toast';

import AddAiPromptModal from './AddAiPromptModal';
import './index.css';

const AiPromptsPage = () => {
  useAppSEO({
    title: '提示词管理',
    path: '/ai-prompts',
    robots: 'noindex, nofollow',
  });

  const [keyword, setKeyword] = useState('');
  const [appliedKeyword, setAppliedKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState<AiPrompt[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const loadList = useCallback(async () => {
    setLoading(true);

    try {
      const response = await fetchAiPromptList({
        keyword: appliedKeyword || undefined,
        page,
        pageSize,
      });

      if (response.code !== 0) {
        toast.notify.error(response.message || '加载提示词列表失败');
        return;
      }

      setList(response.data.list);
      setTotal(response.data.total);
    } catch (error) {
      if (error instanceof AppError) {
        showAppError(error);
      } else {
        toast.notify.error('加载提示词列表失败');
      }
    } finally {
      setLoading(false);
    }
  }, [appliedKeyword, page, pageSize]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const applySearch = () => {
    setAppliedKeyword(keyword.trim());
    setPage(1);
  };

  const handleRemarkSave = async (id: string, remark: string) => {
    try {
      const response = await updateAiPromptRemark(id, remark);
      if (response.code !== 0) {
        toast.notify.error(response.message || '备注保存失败');
        return;
      }

      setList((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, remark: response.data.remark, updatedAt: response.data.updatedAt } : item
        )
      );
      toast.notify.success('备注已保存');
    } catch (error) {
      if (error instanceof AppError) {
        showAppError(error);
      } else {
        toast.notify.error('备注保存失败');
      }
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const response = await deleteAiPrompt(id);
      if (response.code !== 0) {
        toast.notify.error(response.message || '删除失败');
        return;
      }

      toast.notify.success('已删除提示词');
      if (list.length === 1 && page > 1) {
        setPage((prev) => prev - 1);
      } else {
        await loadList();
      }
    } catch (error) {
      if (error instanceof AppError) {
        showAppError(error);
      } else {
        toast.notify.error('删除失败');
      }
    } finally {
      setDeletingId(null);
    }
  };

  const columns = useMemo<ColumnsType<AiPrompt>>(
    () => [
      {
        title: '名称',
        dataIndex: 'name',
        key: 'name',
        width: 220,
        ellipsis: true,
        render: (name: string) => <EllipsisTooltip text={name} className="ai-prompts-cell-ellipsis" />,
      },
      {
        title: '提示词信息',
        dataIndex: 'content',
        key: 'content',
        ellipsis: true,
        render: (content: string) => (
          <EllipsisTooltip text={content} className="ai-prompts-cell-ellipsis" />
        ),
      },
      {
        title: '备注',
        dataIndex: 'remark',
        key: 'remark',
        width: 220,
        render: (remark: string, record) => (
          <RemarkEditor
            value={remark}
            maxLength={128}
            onSave={(value) => handleRemarkSave(record.id, value)}
          />
        ),
      },
      {
        title: '创建者',
        dataIndex: 'creatorName',
        key: 'creatorName',
        width: 120,
        ellipsis: true,
        render: (creatorName: string) => (
          <EllipsisTooltip text={creatorName} className="ai-prompts-cell-ellipsis" />
        ),
      },
      {
        title: '创建时间',
        dataIndex: 'createdAt',
        key: 'createdAt',
        width: 160,
        render: (createdAt: string) => formatToDateTime(createdAt),
      },
      {
        title: '编辑时间',
        dataIndex: 'updatedAt',
        key: 'updatedAt',
        width: 160,
        render: (updatedAt: string) => formatToDateTime(updatedAt),
      },
      {
        title: '操作',
        key: 'actions',
        width: 80,
        fixed: 'right',
        render: (_, record) => (
          <Popconfirm
            title="确认删除该提示词？"
            description="删除后不可恢复。"
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true, loading: deletingId === record.id }}
            onConfirm={() => void handleDelete(record.id)}
          >
            <Button
              type="link"
              danger
              className="ai-prompts-action-btn"
              icon={<LuTrash2 size={14} />}
              loading={deletingId === record.id}
            >
              删除
            </Button>
          </Popconfirm>
        ),
      },
    ],
    [deletingId]
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
    <div className="ai-prompts-page">
      <div className="ai-prompts-header">
        <div>
          <h1 className="ai-prompts-title">提示词管理</h1>
          <p className="ai-prompts-desc">管理 AI 切片使用的提示词，支持添加、搜索、备注与删除。</p>
        </div>
        <Button type="primary" icon={<LuPlus size={16} />} onClick={() => setAddOpen(true)}>
          添加提示词
        </Button>
      </div>

      <div className="ai-prompts-toolbar">
        <div className="ai-prompts-toolbar-filters">
          <Input
            className="ai-prompts-search-input"
            allowClear
            prefix={<LuSearch size={14} />}
            placeholder="搜索：名称 / 提示词 / 备注（支持 关键词A+关键词B）"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            onPressEnter={applySearch}
          />
          <Button type="primary" onClick={applySearch}>
            搜索
          </Button>
        </div>
      </div>

      <Table<AiPrompt>
        className="ai-prompts-table"
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={list}
        scroll={{ x: 1200 }}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: (count) => `共 ${count} 条`,
        }}
        onChange={handleTableChange}
      />

      <AddAiPromptModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSuccess={() => {
          if (page !== 1) {
            setPage(1);
          } else {
            void loadList();
          }
        }}
      />
    </div>
  );
};

export default AiPromptsPage;
