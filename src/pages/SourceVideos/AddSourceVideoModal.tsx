import { Form, Input, Modal, DatePicker } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useEffect, useState } from 'react';

import { AppError } from '~/services/http';
import { createSourceVideo } from '~/services/sourceVideo';
import { showAppError, toast } from '~/utils/toast';

type FormValues = {
  name: string;
  liveUrl: string;
  remarkName?: string;
  date: Dayjs;
};

interface AddSourceVideoModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AddSourceVideoModal = ({ open, onClose, onSuccess }: AddSourceVideoModalProps) => {
  const [form] = Form.useForm<FormValues>();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue({ date: dayjs() });
  }, [form, open]);

  const handleClose = () => {
    form.resetFields();
    onClose();
  };

  const handleSubmit = async (values: FormValues) => {
    setSubmitting(true);

    try {
      const response = await createSourceVideo({
        name: values.name.trim(),
        liveUrl: values.liveUrl.trim(),
        remarkName: values.remarkName?.trim(),
        date: values.date.format('YYYY-MM-DD'),
      });

      if (response.code !== 0) {
        toast.notify.error(response.message || '添加失败');
        return;
      }

      toast.notify.success('源视频已添加，正在进行 ASR 转写');
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
      title="添加源视频"
      open={open}
      okText="添加"
      cancelText="取消"
      confirmLoading={submitting}
      destroyOnClose
      onCancel={handleClose}
      onOk={() => form.submit()}
    >
      <Form form={form} layout="vertical" initialValues={{ date: dayjs() }} onFinish={handleSubmit}>
        <Form.Item
          name="name"
          label="直播名称"
          rules={[{ required: true, whitespace: true, message: '请输入直播名称' }]}
        >
          <Input placeholder="请输入直播源名称" maxLength={128} allowClear />
        </Form.Item>

        <Form.Item
          name="liveUrl"
          label="直播地址"
          rules={[
            { required: true, whitespace: true, message: '请输入直播地址' },
            {
              validator: (_, value: string | undefined) => {
                const trimmed = value?.trim();
                if (!trimmed) return Promise.resolve();
                if (/^(https?|rtmp):\/\/.+/i.test(trimmed)) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('请输入有效的直播地址（http/https/rtmp）'));
              },
            },
          ]}
        >
          <Input placeholder="请输入直播流地址，如 rtmp:// 或 https://" maxLength={512} allowClear />
        </Form.Item>

        <Form.Item name="remarkName" label="备注名称">
          <Input placeholder="选填，便于后续搜索识别" maxLength={64} allowClear />
        </Form.Item>

        <Form.Item name="date" label="时间" rules={[{ required: true, message: '请选择日期' }]}>
          <DatePicker className="source-videos-form-date" placeholder="选择日期" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AddSourceVideoModal;
