import { FaQrcode, FaSync } from 'react-icons/fa';
import { Button, Flex, Spin } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '~/context/AuthContext';
import { fetchQRCode, fetchQRCodeLogin } from '~/services/login';
import { trackEvent } from '~/utils/gtm';
import { useLoginModalStore } from './store';

const GET_QRCODE_TIME = 300 * 1000;
const CHECK_TIME = 2 * 1000;

const QrcodeLogin = () => {
  const { open } = useLoginModalStore();
  const { updateAuthInfo } = useAuth();
  const [ticket, setTicket] = useState<string>('');
  const [expireStr, setExpireStr] = useState<string>('');

  const checkTimerRef = useRef<number | NodeJS.Timeout | null>(null);
  const expireTimerRef = useRef<number | NodeJS.Timeout | null>(null);

  const deleteCheckTimer = () => {
    if (checkTimerRef.current !== null) {
      clearTimeout(checkTimerRef.current);
      checkTimerRef.current = null;
    }
  };

  const getQrcode = useCallback(async () => {
    setTicket('');
    setExpireStr('');
    const { code, data } = await fetchQRCode();
    if (code === 0) {
      setTicket(data.ticket);
      expireTimerRef.current = setTimeout(() => {
        deleteCheckTimer();
        setTicket('');
        setExpireStr('二维码超时');
      }, GET_QRCODE_TIME);
    } else {
      setExpireStr('获取二维码失败');
    }
  }, []);

  const checkLogin = useCallback(async () => {
    deleteCheckTimer();
    if (!ticket || expireStr) {
      return;
    }
    const { code, data } = await fetchQRCodeLogin(ticket);
    if (code === 0) {
      trackEvent('qrcodeLogin', {
        userId: data.id || '*',
        ticket,
      });
      updateAuthInfo(data);
    } else {
      checkTimerRef.current = setTimeout(() => {
        void checkLogin();
      }, CHECK_TIME);
    }
  }, [ticket, expireStr, updateAuthInfo]);

  useEffect(() => {
    if (open) {
      void getQrcode();
    } else {
      setTicket('');
      deleteCheckTimer();
      if (expireTimerRef.current) {
        clearTimeout(expireTimerRef.current);
        expireTimerRef.current = null;
      }
    }
  }, [open, getQrcode]);

  useEffect(() => {
    void checkLogin();
  }, [checkLogin]);

  return (
    <Flex vertical align="center" className="flex-1 qrcode-login">
      <Flex className="qrcode-ct" align="center" justify="center">
        {ticket ? (
          <img
            src={`https://mp.weixin.qq.com/cgi-bin/showqrcode?ticket=${encodeURIComponent(ticket)}`}
            alt="Account"
            className="qrcode-login-icon"
          />
        ) : (
          !expireStr && <Spin size="large" />
        )}
        {expireStr && (
          <span className="qrcode-refresh size-full">
            <Flex
              className="qrcode-refresh-inner size-full"
              gap={6}
              vertical
              align="center"
              justify="center"
            >
              {expireStr}
              <Button type="link" onClick={() => void getQrcode()} icon={<FaSync size={24} />} />
            </Flex>
          </span>
        )}
      </Flex>
      <span className="qrcode-login-text mt-4">
        <FaQrcode className="svg-inline--fa fa-qrcode qrcode-tip-icon" />
        请使用微信扫描二维码登录
      </span>
    </Flex>
  );
};

export default QrcodeLogin;
