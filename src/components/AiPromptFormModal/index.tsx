import { Form, Input, Modal } from 'antd';
import { useEffect, useState } from 'react';

import { AppError } from '~/services/http';
import { createAiPrompt, updateAiPrompt, type AiPrompt } from '~/services/aiPrompt';
import { showAppError, toast } from '~/utils/toast';

type FormValues = {
  name: string;
  content: string;
  remark?: string;
};

interface AiPromptFormModalProps {
  open: boolean;
  prompt?: AiPrompt | null;
  onClose: () => void;
  onSuccess: (prompt: AiPrompt) => void;
}

const AiPromptFormModal = ({ open, prompt, onClose, onSuccess }: AiPromptFormModalProps) => {
  const [form] = Form.useForm<FormValues>();
  const [submitting, setSubmitting] = useState(false);
  const isEdit = Boolean(prompt);

  useEffect(() => {
    if (!open) return;

    if (prompt) {
      form.setFieldsValue({
        name: prompt.name,
        content: prompt.content,
        remark: prompt.remark,
      });
      return;
    }

    form.resetFields();
  }, [form, open, prompt]);

  const handleClose = () => {
    form.resetFields();
    onClose();
  };

  const handleSubmit = async (values: FormValues) => {
    setSubmitting(true);

    try {
      const payload = {
        name: values.name.trim(),
        content: values.content.trim(),
        remark: values.remark?.trim(),
      };

      const response = isEdit && prompt
        ? await updateAiPrompt(prompt.id, payload)
        : await createAiPrompt(payload);

      if (response.code !== 0) {
        toast.notify.error(response.message || `${isEdit ? '保存' : '添加'}失败`);
        return;
      }

      toast.notify.success(isEdit ? '提示词已保存' : '提示词已添加');
      handleClose();
      onSuccess(response.data);
    } catch (error) {
      if (error instanceof AppError) {
        showAppError(error);
      } else {
        toast.notify.error(`${isEdit ? '保存' : '添加'}失败`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={isEdit ? '编辑提示词' : '添加提示词'}
      open={open}
      okText={isEdit ? '保存' : '添加'}
      cancelText="取消"
      confirmLoading={submitting}
      destroyOnClose
      onCancel={handleClose}
      onOk={() => form.submit()}
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item
          name="name"
          label="名称"
          rules={[{ required: true, whitespace: true, message: '请输入名称' }]}
        >
          <Input placeholder="请输入提示词名称" maxLength={64} allowClear />
        </Form.Item>

        <Form.Item
          name="content"
          label="提示词信息"
          rules={[{ required: true, whitespace: true, message: '请输入提示词信息' }]}
        >
          <Input.TextArea
            placeholder="请输入 AI 提示词内容"
            maxLength={2000}
            rows={5}
            showCount
            allowClear
          />
        </Form.Item>

        <Form.Item name="remark" label="备注">
          <Input placeholder="选填，便于后续搜索识别" maxLength={128} allowClear />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AiPromptFormModal;
