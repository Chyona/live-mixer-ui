import { Button } from 'antd';
import { openLogin } from '~/utils/loginFlow';
import { useLoginModalStore } from '../LoginModal/store';
import { LockOutlined } from '@ant-design/icons';
import React, { useEffect, useState } from 'react';

const LoginMask = () => {
  const { open } = useLoginModalStore();
  const [scale, setScale] = useState(1);

  // 添加呼吸灯效果
  useEffect(() => {
    const interval = setInterval(() => {
      setScale((prev) => (prev === 1 ? 1.05 : 1));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {!open && (
        <div className="fixed rounded-xl top-0 left-0 w-full h-full bg-[rgba(0,0,0,0.5)] flex justify-center z-[10]">
          {/* 炫酷登录按钮 */}
          <Button
            type="primary"
            icon={<LockOutlined className="mr-2" />}
            size="large"
            onClick={() => openLogin()}
            className="pointer-events-auto relative overflow-hidden group mt-40"
            style={{
              padding: '16px 32px',
              fontSize: '18px',
              fontWeight: 'bold',
              border: 'none',
              borderRadius: '12px',
              background: 'linear-gradient(45deg, #3b82f6, #06b6d4)',
              boxShadow: '0 10px 25px rgba(59, 130, 246, 0.5), 0 0 0 2px rgba(59, 130, 246, 0.2)',
              transition: 'all 0.3s ease',
              transform: `scale(${scale})`,
            }}
          >
            {/* 按钮内部发光效果 */}
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent transform -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>

            <span className="relative z-10 text-white">立即登录</span>

            {/* 悬停时的额外发光效果 */}
            <span className="absolute inset-0 rounded-full bg-blue-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
          </Button>
        </div>
      )}
    </>
  );
};

export default LoginMask;
