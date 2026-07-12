import { Button, Empty, Input, Radio, Spin } from 'antd';
import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import { LuPencil, LuPlus, LuSearch } from 'react-icons/lu';

import AiPromptFormModal from '~/components/AiPromptFormModal';
import EllipsisTooltip from '~/components/EllipsisTooltip';
import { AppError } from '~/services/http';
import { fetchAiPromptList, type AiPrompt } from '~/services/aiPrompt';
import { showAppError, toast } from '~/utils/toast';

import './PromptPickerPanel.css';

const PAGE_SIZE = 8;

interface PromptPickerPanelProps {
  selectedId: string | null;
  onSelect: (prompt: AiPrompt) => void;
}

const PromptPickerPanel = ({ selectedId, onSelect }: PromptPickerPanelProps) => {
  const [keyword, setKeyword] = useState('');
  const [appliedKeyword, setAppliedKeyword] = useState('');
  const [list, setList] = useState<AiPrompt[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<AiPrompt | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  const hasMore = list.length < total;

  const loadPage = useCallback(
    async (nextPage: number, keywordValue: string, append: boolean) => {
      if (loadingRef.current) return;

      loadingRef.current = true;
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      try {
        const response = await fetchAiPromptList({
          keyword: keywordValue || undefined,
          page: nextPage,
          pageSize: PAGE_SIZE,
        });

        if (response.code !== 0) {
          toast.notify.error(response.message || '加载提示词失败');
          return;
        }

        setTotal(response.data.total);
        setPage(nextPage);
        setList((prev) => (append ? [...prev, ...response.data.list] : response.data.list));
      } catch (error) {
        if (error instanceof AppError) {
          showAppError(error);
        } else {
          toast.notify.error('加载提示词失败');
        }
      } finally {
        loadingRef.current = false;
        setLoading(false);
        setLoadingMore(false);
      }
    },
    []
  );

  const reload = useCallback(() => {
    void loadPage(1, appliedKeyword, false);
  }, [appliedKeyword, loadPage]);

  useEffect(() => {
    void loadPage(1, appliedKeyword, false);
  }, [appliedKeyword, loadPage]);

  useEffect(() => {
    if (selectedId || list.length === 0) return;
    const firstItem = list[0];
    if (firstItem) {
      onSelect(firstItem);
    }
  }, [list, onSelect, selectedId]);

  const handleSearch = () => {
    setAppliedKeyword(keyword.trim());
  };

  const handleLoadMore = useCallback(() => {
    if (!hasMore || loading || loadingMore) return;
    void loadPage(page + 1, appliedKeyword, true);
  }, [appliedKeyword, hasMore, loadPage, loading, loadingMore, page]);

  useEffect(() => {
    const container = listRef.current;
    if (!container) return;

    const handleScroll = () => {
      const distance = container.scrollHeight - container.scrollTop - container.clientHeight;
      if (distance <= 48) {
        handleLoadMore();
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleLoadMore]);

  const handleFormSuccess = (prompt: AiPrompt) => {
    if (editingPrompt) {
      setList((prev) => prev.map((item) => (item.id === prompt.id ? prompt : item)));
      if (selectedId === prompt.id) {
        onSelect(prompt);
      }
      return;
    }

    reload();
    onSelect(prompt);
  };

  const openCreate = () => {
    setEditingPrompt(null);
    setFormOpen(true);
  };

  const openEdit = (prompt: AiPrompt, event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setEditingPrompt(prompt);
    setFormOpen(true);
  };

  return (
    <aside className="slice-prompt-panel">
      <div className="slice-prompt-panel__header">
        <div className="slice-prompt-panel__header-main">
          <h3 className="slice-prompt-panel__title">AI 提示词</h3>
          <p className="slice-prompt-panel__desc">选择用于成片的提示词</p>
        </div>

        <div className="slice-prompt-panel__header-actions">
          <Input
            allowClear
            size="small"
            prefix={<LuSearch size={14} />}
            placeholder="搜索名称 / 内容"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            onPressEnter={handleSearch}
          />
          <Button type="primary" size="small" icon={<LuPlus size={14} />} onClick={openCreate}>
            新增
          </Button>
        </div>
      </div>

      <div ref={listRef} className="slice-prompt-panel__list">
        {loading && list.length === 0 ? (
          <div className="slice-prompt-panel__loading">
            <Spin size="small" />
          </div>
        ) : list.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无提示词" />
        ) : (
          <Radio.Group
            className="slice-prompt-panel__radio-group"
            value={selectedId ?? undefined}
            onChange={(event) => {
              const next = list.find((item) => item.id === event.target.value);
              if (next) onSelect(next);
            }}
          >
            {list.map((item) => (
              <label
                key={item.id}
                className={`slice-prompt-panel__item${selectedId === item.id ? ' active' : ''}`}
              >
                <Radio value={item.id} className="slice-prompt-panel__radio" />
                <div className="slice-prompt-panel__item-body">
                  <div className="slice-prompt-panel__item-head">
                    <span className="slice-prompt-panel__item-name">{item.name}</span>
                    <button
                      type="button"
                      className="slice-prompt-panel__edit-btn"
                      aria-label={`编辑 ${item.name}`}
                      onClick={(event) => openEdit(item, event)}
                    >
                      <LuPencil size={13} />
                    </button>
                  </div>
                  <EllipsisTooltip
                    text={item.content}
                    className="slice-prompt-panel__item-content"
                  />
                </div>
              </label>
            ))}
          </Radio.Group>
        )}

        {loadingMore ? (
          <div className="slice-prompt-panel__loading slice-prompt-panel__loading_more">
            <Spin size="small" />
            <span>加载更多...</span>
          </div>
        ) : null}

        {!loading && list.length > 0 && !hasMore ? (
          <div className="slice-prompt-panel__end">已加载全部 {total} 条</div>
        ) : null}
      </div>

      <AiPromptFormModal
        open={formOpen}
        prompt={editingPrompt}
        onClose={() => {
          setFormOpen(false);
          setEditingPrompt(null);
        }}
        onSuccess={handleFormSuccess}
      />
    </aside>
  );
};

export default PromptPickerPanel;
