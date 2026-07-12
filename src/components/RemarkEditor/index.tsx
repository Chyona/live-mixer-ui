import { Input } from 'antd';
import { useEffect, useState } from 'react';

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
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const handleBlur = async () => {
    const trimmed = draft.trim();
    if (required && !trimmed) {
      setDraft(value);
      return;
    }
    if (trimmed === value) return;

    setSaving(true);
    try {
      await onSave(trimmed);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Input
      className={['remark-editor', className].filter(Boolean).join(' ')}
      value={draft}
      placeholder={placeholder}
      maxLength={maxLength}
      disabled={saving}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => void handleBlur()}
      onPressEnter={(event) => event.currentTarget.blur()}
    />
  );
};

export default RemarkEditor;
