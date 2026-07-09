import { Form, Input, Modal } from 'antd';

interface SaveDraftModalProps {
  open: boolean;
  title: string;
  defaultName: string;
  loading: boolean;
  onCancel: () => void;
  onSubmit: (name: string) => void;
}

const SaveDraftModal = ({
  open,
  title,
  defaultName,
  loading,
  onCancel,
  onSubmit,
}: SaveDraftModalProps) => {
  const [form] = Form.useForm<{ name: string }>();

  return (
    <Modal
      open={open}
      title={title}
      okText="确定"
      cancelText="取消"
      confirmLoading={loading}
      destroyOnClose
      onCancel={() => {
        form.resetFields();
        onCancel();
      }}
      onOk={() => {
        void form.validateFields().then((values) => {
          onSubmit(values.name.trim());
          form.resetFields();
        });
      }}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ name: defaultName }}
        key={`${open}-${defaultName}`}
      >
        <Form.Item
          label="草稿名称"
          name="name"
          rules={[{ required: true, message: '请输入草稿名称' }]}
        >
          <Input placeholder="请输入草稿名称" maxLength={50} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default SaveDraftModal;
