import { Button, Drawer } from 'antd';
import { LuSquarePen, LuX } from 'react-icons/lu';

import type { AiPrompt } from '~/services/aiPrompt';

import './index.css';

interface AiPromptPreviewDrawerProps {
  open: boolean;
  prompt: AiPrompt | null;
  onClose: () => void;
  onEdit?: (prompt: AiPrompt) => void;
}

const AiPromptPreviewDrawer = ({ open, prompt, onClose, onEdit }: AiPromptPreviewDrawerProps) => {
  const canEdit = prompt?.is_editable === 1 && Boolean(onEdit);
  const charCount = prompt?.content?.length ?? 0;

  return (
    <Drawer
      className="ai-prompt-preview-drawer"
      title={null}
      placement="right"
      width="min(640px, 100vw)"
      open={open}
      onClose={onClose}
      closable={false}
      destroyOnClose
    >
      {prompt ? (
        <div className="ai-prompt-preview-drawer__layout">
          <header className="ai-prompt-preview-drawer__header">
            <div className="ai-prompt-preview-drawer__header-main">
              <h3 className="ai-prompt-preview-drawer__title">{prompt.name}</h3>
              <p className="ai-prompt-preview-drawer__meta">
                {prompt.remark ? <span>备注：{prompt.remark}</span> : <span>暂无备注</span>}
                <span className="ai-prompt-preview-drawer__meta-sep">·</span>
                <span>{charCount} 字</span>
              </p>
            </div>
            <button
              type="button"
              className="ai-prompt-preview-drawer__close"
              aria-label="关闭"
              onClick={onClose}
            >
              <LuX size={18} />
            </button>
          </header>

          <div className="ai-prompt-preview-drawer__body">
            <pre className="ai-prompt-preview-drawer__content">{prompt.content}</pre>
          </div>

          <footer className="ai-prompt-preview-drawer__footer">
            {canEdit ? (
              <Button
                type="primary"
                icon={<LuSquarePen size={14} />}
                onClick={() => {
                  onEdit?.(prompt);
                  onClose();
                }}
              >
                编辑提示词
              </Button>
            ) : (
              <span className="ai-prompt-preview-drawer__footer-hint">系统提示词不可编辑</span>
            )}
          </footer>
        </div>
      ) : null}
    </Drawer>
  );
};

export default AiPromptPreviewDrawer;
