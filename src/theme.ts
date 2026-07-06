import { ThemeConfig } from 'antd';

/**
 * Theme configuration for Ant Design components.
 * https://ant.design/docs/react/customize-theme
 * 这里只能配置token和components，不能配置css变量样式
 * 配置css变量样式需要在 global.css 中进行配置
 * 如：
 * .ant-tooltip {
 *   --antd-arrow-background-color:#f00;
 * }
 */
export const theme = {
  token: {
    colorPrimary: '#356bfd',
    fontSize: 16,
    colorBorder: '#e2e8f0',
  },
  components: {
    Tabs: {
      // tabsHorizontalItemMargin: 20,
      // horizontalItemPadding: '8px 8px',
      // horizontalItemPaddingLG: '8px 8px',
    },
    Button: {
      borderRadius: 8,
    },
    Drawer: {
      fontSizeLG: 16,
    },
    Tooltip: {
      colorBgSpotlight: '#fff',
      colorTextLightSolid: 'rgba(0, 0, 0, 0.85)',
    },
    Modal: {
      borderRadius: 2,
      titleFontSize: 16,
      titleLineHeight: 1.5,
    },
    Form: {
      labelColor: '#8A8C99',
      labelFontSize: 12,
    },
    Table: {},
    // Notification: {
    // 	notificationPadding: '12px 16px'
    // }
  },
} as ThemeConfig;

export default theme;
