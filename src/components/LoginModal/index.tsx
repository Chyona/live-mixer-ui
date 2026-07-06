import { Modal } from 'antd';
import { FaBolt, FaShieldAlt, FaRocket } from 'react-icons/fa';
import FeatureTag from './FeatureTag';
import Logo_src from '~/assets/images/logo.png';
import QrcodeLogin from './qrcode';
import { closeLogin } from '~/utils/loginFlow';
import { useLoginModalStore } from './store';
import { appConfig } from '~/utils/config';

import './index.css';

const LoginModal = () => {
  const { open } = useLoginModalStore();

  return (
    <Modal
      className="noanimation-modal"
      zIndex={1000}
      width={420}
      open={open}
      centered
      maskClosable={false}
      onCancel={() => closeLogin()}
      footer={null}
    >
      <div className="login-brand">
        <img src={Logo_src} className="login-logo" alt="logo" />
        <h2 className="login-brand-text">{appConfig.title}</h2>
      </div>
      <p className="login-subtitle">欢迎登录 {appConfig.title}</p>
      <div className="login-content-wrapper">
        <QrcodeLogin />
      </div>
      <div className="features">
        <FeatureTag icon={<FaBolt />} name="快速开发" color="video" animation="pulse" />
        <FeatureTag icon={<FaShieldAlt />} name="安全可靠" color="email" animation="float" />
        <FeatureTag icon={<FaRocket />} name="开箱即用" color="accent" animation="rotate" />
      </div>
    </Modal>
  );
};

export default LoginModal;
