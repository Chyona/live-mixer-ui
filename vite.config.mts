/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite';
import { createHtmlPlugin } from 'vite-plugin-html';
import svg from 'vite-plugin-svgr';
import tsconfigPaths from 'vite-tsconfig-paths';
import react from '@vitejs/plugin-react-swc';
import { viteMockServe } from 'vite-plugin-mock';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  const apiPrefix = env.VITE_API_PREFIX || '/openapi';
  const useMock = env.VITE_MOCK === 'true' || process.env.VITE_MOCK === 'true';
  const appTitle = env.VITE_APP_TITLE || 'Base UI';
  const appDescription =
    env.VITE_APP_DESCRIPTION || '基于 React + Vite + Ant Design 的前端项目模板';

  return {
    clearScreen: false,
    server: {
      port: 8008,
      proxy: {
        [apiPrefix]: {
          target: env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:3000',
          changeOrigin: true,
        },
      },
    },
    build: {
      rollupOptions: {
        treeshake: 'recommended',
        output: {
          manualChunks: {
            react: ['react', 'react-dom', 'react-router-dom'],
            antd: ['antd', '@ant-design/icons'],
          },
        },
      },
      sourcemap: process.env.GENERATE_SOURCEMAP === 'false' ? false : true,
      outDir: 'dist',
      assetsDir: '.',
    },
    plugins: [
      viteMockServe({
        mockPath: 'mock',
        enable: mode === 'development' && useMock,
        watchFiles: true,
      }),
      tsconfigPaths(),
      react(),
      svg({ svgrOptions: { icon: true } }),
      createHtmlPlugin({
        minify: true,
        inject: {
          data: {
            title: appTitle,
            description: appDescription,
          },
        },
      }),
    ],
    css: {
      modules: {
        localsConvention: 'camelCaseOnly',
      },
    },
    test: {
      environment: 'jsdom',
      setupFiles: './src/setupTests.ts',
      include: ['src/**/*.{test,spec}.{ts,tsx}'],
    },
  };
});
