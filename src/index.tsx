import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import ReactDOM from 'react-dom/client';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import './style/index.css';

import theme from './theme';
import App from './App';
import { initGTM } from './utils/gtm';
import { appConfig } from '~/utils/config';

if (appConfig.enableGtm && appConfig.gtmId) {
  initGTM(appConfig.gtmId);
}

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <ConfigProvider locale={zhCN} theme={theme}>
        <App />
      </ConfigProvider>
    </BrowserRouter>
  </React.StrictMode>
);
