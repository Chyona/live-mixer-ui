import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button, Result } from 'antd';
import { DEFAULT_APP_PATH } from '~/routes/const';

type Props = { children: ReactNode };
type State = { hasError: boolean };

class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  private hmrCleanup?: () => void;

  componentDidMount() {
    if (!import.meta.env.DEV || !import.meta.hot) return;

    const resetErrorState = () => {
      this.setState((state) => (state.hasError ? { hasError: false } : null));
    };

    import.meta.hot.on('vite:beforeUpdate', resetErrorState);
    import.meta.hot.on('vite:afterUpdate', resetErrorState);

    this.hmrCleanup = () => {
      import.meta.hot?.off('vite:beforeUpdate', resetErrorState);
      import.meta.hot?.off('vite:afterUpdate', resetErrorState);
    };
  }

  componentWillUnmount() {
    this.hmrCleanup?.();
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  private handleReset = () => {
    this.setState({ hasError: false });
    window.location.assign(DEFAULT_APP_PATH);
  };

  render() {
    if (this.state.hasError) {
      return (
        <Result
          status="error"
          title="页面出错了"
          subTitle="请刷新页面或返回首页后重试。"
          extra={
            <Button type="primary" onClick={this.handleReset}>
              返回首页
            </Button>
          }
        />
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
