import { Button, Divider, Select } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState, type UIEvent } from 'react';
import { LuPlus } from 'react-icons/lu';

import AiPromptFormModal from '~/components/AiPromptFormModal';
import { AppError } from '~/services/http';
import { fetchAiPromptList, type AiPrompt } from '~/services/aiPrompt';
import { toApiKeywords } from '~/utils/listKeywords';
import { showAppError, toast } from '~/utils/toast';

import './PromptSelect.css';

const PAGE_SIZE = 50;

interface PromptSelectProps {
  selectedId: number | null;
  /** 编辑回显：优先选中该 id（若不在首屏则继续分页查找） */
  preferredId?: number | null;
  onSelect: (prompt: AiPrompt) => void;
  className?: string;
}

const PromptSelect = ({
  selectedId,
  preferredId = null,
  onSelect,
  className,
}: PromptSelectProps) => {
  const [list, setList] = useState<AiPrompt[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const loadingRef = useRef(false);

  const hasMore = list.length < total;

  const loadPage = useCallback(async (nextPage: number, append: boolean) => {
    if (loadingRef.current) return;

    loadingRef.current = true;
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await fetchAiPromptList({
        keywords: toApiKeywords(''),
        page: nextPage,
        page_size: PAGE_SIZE,
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
  }, []);

  useEffect(() => {
    void loadPage(1, false);
  }, [loadPage]);

  useEffect(() => {
    if (selectedId || list.length === 0) return;

    if (preferredId) {
      const matched = list.find((item) => item.id === preferredId);
      if (matched) {
        onSelect(matched);
        return;
      }
      if (hasMore && !loading && !loadingMore) {
        void loadPage(page + 1, true);
        return;
      }
      if (hasMore || loading || loadingMore) return;
    }

    const firstItem = list[0];
    if (firstItem) {
      onSelect(firstItem);
    }
  }, [
    hasMore,
    list,
    loadPage,
    loading,
    loadingMore,
    onSelect,
    page,
    preferredId,
    selectedId,
  ]);

  const options = useMemo(
    () =>
      list.map((item) => ({
        value: item.id,
        label: item.name,
        title: item.content,
      })),
    [list]
  );

  const handleChange = (value: number) => {
    const next = list.find((item) => item.id === value);
    if (next) onSelect(next);
  };

  const handlePopupScroll = (event: UIEvent<HTMLDivElement>) => {
    const target = event.target as HTMLDivElement;
    if (target.scrollHeight - target.scrollTop - target.clientHeight > 48) return;
    if (!hasMore || loading || loadingMore) return;
    void loadPage(page + 1, true);
  };

  const handleFormSuccess = (prompt: AiPrompt) => {
    setList((prev) => {
      const index = prev.findIndex((item) => item.id === prompt.id);
      if (index >= 0) {
        const next = [...prev];
        next[index] = prompt;
        return next;
      }
      return [prompt, ...prev];
    });
    setTotal((prev) => (list.some((item) => item.id === prompt.id) ? prev : prev + 1));
    onSelect(prompt);
  };

  return (
    <div className={['slice-prompt-select', className].filter(Boolean).join(' ')}>
      <span className="slice-prompt-select__label">AI 提示词</span>
      <Select
        className="slice-prompt-select__control"
        showSearch
        placeholder="请选择提示词"
        value={selectedId ?? undefined}
        options={options}
        loading={loading && list.length === 0}
        optionFilterProp="label"
        popupMatchSelectWidth={280}
        onChange={handleChange}
        onPopupScroll={handlePopupScroll}
        dropdownRender={(menu) => (
          <>
            {menu}
            <Divider style={{ margin: '4px 0' }} />
            <div className="slice-prompt-select__footer">
              <Button
                type="link"
                size="small"
                icon={<LuPlus size={14} />}
                onClick={() => setFormOpen(true)}
              >
                新增提示词
              </Button>
            </div>
          </>
        )}
      />

      <AiPromptFormModal
        open={formOpen}
        prompt={null}
        onClose={() => setFormOpen(false)}
        onSuccess={(prompt) => {
          handleFormSuccess(prompt);
          setFormOpen(false);
        }}
      />
    </div>
  );
};

export default PromptSelect;
