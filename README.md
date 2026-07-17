# Base UI

基于 **React 18 + Vite 5 + TypeScript + Ant Design 5 + Tailwind CSS** 的前端项目模板。

## 快速开始

```bash
pnpm install
cp .env.example .env   # 按需修改配置
pnpm dev
```

## 常用命令

| 命令             | 说明                             |
| ---------------- | -------------------------------- |
| `pnpm dev`       | 启动开发服务器（端口 8008）      |
| `pnpm dev:mock`  | 启用 Mock 数据开发               |
| `pnpm build`     | 生产构建                         |
| `pnpm preview`   | 预览构建产物                     |
| `pnpm lint`      | ESLint 检查                      |
| `pnpm lint:css`  | Stylelint 检查 CSS               |
| `pnpm typecheck` | TypeScript 类型检查              |
| `pnpm test:run`  | 运行单元测试（单次）             |
| `pnpm test`      | 运行单元测试（watch 模式）       |
| `pnpm validate`  | lint + typecheck + test 一键校验 |

## 环境变量

| 文件                     | 用途                                              |
| ------------------------ | ------------------------------------------------- |
| `.env.example`           | 模板，复制为 `.env`                               |
| `.env`                   | 本地开发默认（gitignore）                         |
| `.env.development.local` | 本地联调代理/Mock（gitignore，**仅** `pnpm dev`） |
| `.env.production`        | **生产打包**（`pnpm build`）                      |

复制 `.env.example` 为 `.env` 后按需修改：

| 变量                      | 说明                                               | 默认值                |
| ------------------------- | -------------------------------------------------- | --------------------- |
| `VITE_APP_TITLE`          | 应用名称（同步注入 `index.html` title / meta）     | Base UI               |
| `VITE_APP_DESCRIPTION`    | 应用描述（同步注入 `index.html` meta description） | -                     |
| `VITE_SITE_URL`           | 站点 URL                                           | http://localhost:8008 |
| `VITE_NAV_LAYOUT`         | 导航布局 `top` / `left`                            | top                   |
| `VITE_API_PREFIX`         | API 路径前缀                                       | `/openapi`            |
| `VITE_API_PROXY_TARGET`   | 开发代理目标                                       | http://127.0.0.1:3000 |
| `VITE_GTM_ID`             | Google Tag Manager ID                              | 空（不启用）          |
| `VITE_ENABLE_FLOAT`       | 是否显示悬浮客服                                   | true                  |
| `VITE_LOGIN_MODE`         | 登录方式 `page` / `modal`                          | page                  |
| `VITE_CONTACT_QRCODE_URL` | 客服二维码图片 URL                                 | 空（不显示二维码）    |
| `VITE_SUPPORT_TITLE`      | 客服悬浮窗标题                                     | `{应用名} 技术支持`   |
| `VITE_MOCK`               | 开发环境是否启用 Mock                              | false                 |

## 自定义 API 前缀

默认 API 前缀为 `/openapi`，请求路径在 `services/` 中写相对路径（如 `/v1/user`），由 `src/utils/api.ts` 自动拼接。

修改前缀只需两处保持一致：

1. `.env` 中设置 `VITE_API_PREFIX=/your-prefix`
2. `vite.config.mts` 会通过该变量配置 dev proxy（无需手改）

Mock 路由通过 `mock/_config.ts` 自动读取同一环境变量，无需手动同步。

```ts
// services/user.ts — 只需写相对路径
return await request('/v1/user', { method: 'get', params: { id } });
```

生产环境需在 Nginx / 网关层将 `{API_PREFIX}/*` 反向代理到后端。

## Mock 数据

| 场景      | 命令 / 配置                                                                       |
| --------- | --------------------------------------------------------------------------------- |
| 启用 Mock | `.env` 中 `VITE_MOCK=true`，或运行 `pnpm dev:mock`                                |
| 关闭 Mock | `pnpm dev`（不带 mock 环境变量）                                                  |
| Mock 文件 | `mock/` 目录，入口见 `mock/user.ts`                                               |
| 新增 Mock | 在 `mock/` 追加路由，URL 使用 `` `${API_PREFIX}/v1/...` ``（前缀自动读取 `.env`） |

Mock 仅在开发环境生效，生产构建不会打包 mock 代码。

## 登录方式

通过 `VITE_LOGIN_MODE` 切换，所有入口（导航栏、受保护路由、401、会话过期、退出登录）统一走 `openLogin()`：

| 模式       | 值             | 行为                                            |
| ---------- | -------------- | ----------------------------------------------- |
| 独立登录页 | `page`（默认） | 跳转 `/login`，使用登录页布局                   |
| 弹窗登录   | `modal`        | 在 `MainLayout` 挂载 `LoginModal`，不离开当前壳 |

```bash
# 使用弹窗登录
VITE_LOGIN_MODE=modal
```

`modal` 模式下：

- 未登录访问受保护路由时**停留在当前 URL**，页面显示加载占位并自动打开登录弹窗（不会跳转到首页）
- 直接访问 `/login` 会重定向到 `/` 并打开弹窗
- 登录成功后跳回 `returnTo` 记录的来源路径

## 登录流程

未登录访问受保护路由、会话过期（HTTP 401 / 业务码 12010）、退出登录，均通过 `src/services/authSession.ts` 的 `handleSessionExpired` / `src/utils/loginFlow.ts` 按上述模式处理。会话失效时**立即**清本地凭证并进入登录。

## 全局提示（Toast）

项目已集成 **Ant Design message / notification** 封装（`src/utils/toast.ts`），与 `ConfigProvider` 主题一致，**未引入 react-toastify**（避免与 antd 双套 UI 冲突）。

```tsx
import { toast, showAppError } from '~/utils/toast';
import { AppError } from '~/services/http';

toast.success('保存成功');
toast.error('操作失败');

// 右上角通知，默认带 showProgress 自动关闭倒计时条（antd ≥5.18）
toast.notify.success('操作成功', '数据已保存');
toast.notify.error('提交失败', '请检查表单后重试', { duration: 5 });
// 不需要进度条时：toast.notify.info('提示', undefined, { showProgress: false });

try {
  await request('/v1/...');
} catch (error) {
  if (error instanceof AppError) showAppError(error);
}
```

`App.tsx` 已通过 `AppWithToast` 挂载 antd `App` 上下文，可在组件外（如 axios 拦截器）安全调用 `toast.*`。

`toast.notify.*` 默认开启 `showProgress`（通知自动关闭倒计时条）；短提示请用 `toast.success` 等 message API。

## 项目结构

```
src/
├── layouts/            # 页面布局（MainLayout、AuthLayout）
├── utils/config.ts     # 应用配置（读取 .env）
├── utils/api.ts        # API 路径拼接
├── components/         # 通用组件（Header、Nav、LoginModal、ErrorBoundary…）
├── context/            # React Context（AuthContext）
├── hooks/              # 自定义 Hooks
├── pages/              # 页面（Login、业务页、404…）
├── routes/             # 路由 & 菜单配置
├── services/           # API 层（http / 业务码 / 会话处理）
├── style/              # 全局 CSS
└── utils/              # 工具函数
```

## 路由与登录

业务页默认需登录。在 `RoutesCfg` 中设置 `public: true` 可将业务页加入公开访问；系统路由 `/login`、`/error`、404 始终公开。

## 新增需登录页面

1. 在 `src/pages/` 创建页面组件
2. 在 `src/routes/const.tsx` 的 `RoutesCfg` 追加配置（**不要**设 `public`）：

```tsx
{
  path: '/dashboard',
  text: '仪表盘',
  icon: FaChartBar,
  element: lazy(() => import('~/pages/Dashboard')),
},
```

3. 路由会自动注册为受保护路由，并出现在导航菜单中

## 新增公开页面

在 `RoutesCfg` 中追加并标记 `public: true`：

```tsx
{
  path: '/about',
  text: '关于',
  icon: FaInfoCircle,
  element: lazy(() => import('~/pages/About')),
  public: true,
},
```

外链菜单项可设置 `href` 跳过路由注册。

## 导航布局

通过 `VITE_NAV_LAYOUT` 切换桌面端导航：

- `top` — 顶部导航
- `left` — 左侧侧边栏

移动端统一使用底部导航。

## 依赖更新

项目已配置 [Dependabot](.github/dependabot.yml)，每周自动提交 npm 与 GitHub Actions 依赖更新 PR。

## 技术栈

- React 18 + React Router 6
- Vite 5 + SWC
- Ant Design 5
- Tailwind CSS 3
- Axios + lodash-es
- Valtio（轻量状态管理）
- Vitest + Stylelint + ESLint + Prettier + Husky
