import { Form, Input, Modal } from 'antd';
import { useState } from 'react';

import { AppError } from '~/services/http';
import { createAiPrompt } from '~/services/aiPrompt';
import { showAppError, toast } from '~/utils/toast';

type FormValues = {
  name: string;
  content: string;
  remark?: string;
};

interface AddAiPromptModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AddAiPromptModal = ({ open, onClose, onSuccess }: AddAiPromptModalProps) => {
  const [form] = Form.useForm<FormValues>();
  const [submitting, setSubmitting] = useState(false);

  const handleClose = () => {
    form.resetFields();
    onClose();
  };

  const handleSubmit = async (values: FormValues) => {
    setSubmitting(true);

    try {
      const response = await createAiPrompt({
        name: values.name.trim(),
        content: values.content.trim(),
        remark: values.remark?.trim(),
      });

      if (response.code !== 0) {
        toast.notify.error(response.message || '添加失败');
        return;
      }

      toast.notify.success('提示词已添加');
      handleClose();
      onSuccess();
    } catch (error) {
      if (error instanceof AppError) {
        showAppError(error);
      } else {
        toast.notify.error('添加失败');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="添加提示词"
      open={open}
      okText="添加"
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

export default AddAiPromptModal;
