import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { Button, Form, Input } from 'antd';
import { useState } from 'react';
import { useAuth } from '~/context/AuthContext';
import { pwdlogin } from '~/services/login';
import { AppError } from '~/services/http';
import { showAppError, toast } from '~/utils/toast';
import { trackEvent } from '~/utils/gtm';

type PasswordFormValues = {
  username: string;
  password: string;
};

const PasswordLogin = () => {
  const { updateAuthInfo } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values: PasswordFormValues) => {
    setLoading(true);
    try {
      const { code, data, message } = await pwdlogin(values);
      if (code === 0 && data) {
        trackEvent('passwordLogin', {
          userId: data.id || '*',
        });
        updateAuthInfo(data);
        return;
      }
      toast.error(message || '登录失败');
    } catch (error) {
      if (error instanceof AppError) {
        showAppError(error);
      } else {
        toast.error('登录失败，请稍后重试');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form
      className="password-login"
      layout="vertical"
      size="large"
      onFinish={handleSubmit}
      autoComplete="off"
    >
      <Form.Item
        name="username"
        label="用户名"
        rules={[{ required: true, message: '请输入用户名' }]}
      >
        <Input prefix={<UserOutlined />} placeholder="请输入用户名" allowClear />
      </Form.Item>
      <Form.Item
        name="password"
        label="密码"
        rules={[{ required: true, message: '请输入密码' }]}
      >
        <Input.Password prefix={<LockOutlined />} placeholder="请输入密码" />
      </Form.Item>
      <Form.Item className="password-login-submit">
        <Button type="primary" htmlType="submit" block loading={loading}>
          登录
        </Button>
      </Form.Item>
    </Form>
  );
};

export default PasswordLogin;
