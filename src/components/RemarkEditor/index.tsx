import { Input, type InputRef } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { LuPencil } from 'react-icons/lu';

import './index.css';

export interface RemarkEditorProps {
  value: string;
  onSave: (value: string) => Promise<void>;
  placeholder?: string;
  maxLength?: number;
  /** 为 true 时，失焦若内容为空则还原为原值且不触发保存 */
  required?: boolean;
  className?: string;
}

const RemarkEditor = ({
  value,
  onSave,
  placeholder = '添加备注',
  maxLength = 64,
  required = false,
  className,
}: RemarkEditorProps) => {
  const [draft, setDraft] = useState(value);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<InputRef>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (!editing) return;
    inputRef.current?.focus({ cursor: 'all' });
  }, [editing]);

  const exitEditing = () => {
    setEditing(false);
  };

  const handleBlur = async () => {
    const trimmed = draft.trim();
    if (required && !trimmed) {
      setDraft(value);
      exitEditing();
      return;
    }
    if (trimmed === value) {
      exitEditing();
      return;
    }

    setSaving(true);
    try {
      await onSave(trimmed);
    } catch {
      // 保存失败：还原为修改前内容
      setDraft(value);
    } finally {
      setSaving(false);
      exitEditing();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      setDraft(value);
      exitEditing();
    }
  };

  if (!editing) {
    const isEmpty = !value.trim();

    return (
      <button
        type="button"
        className={[
          'remark-editor__display',
          isEmpty ? 'remark-editor__display_empty' : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        title={isEmpty ? placeholder : value}
        onClick={() => setEditing(true)}
      >
        <span className="remark-editor__display-text">{isEmpty ? placeholder : value}</span>
        <LuPencil className="remark-editor__display-icon" size={14} aria-hidden />
      </button>
    );
  }

  return (
    <Input
      ref={inputRef}
      className={['remark-editor', className].filter(Boolean).join(' ')}
      value={draft}
      placeholder={placeholder}
      maxLength={maxLength}
      disabled={saving}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => void handleBlur()}
      onKeyDown={handleKeyDown}
      onPressEnter={(event) => event.currentTarget.blur()}
    />
  );
};

export default RemarkEditor;
