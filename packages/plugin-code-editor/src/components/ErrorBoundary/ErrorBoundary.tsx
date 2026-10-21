import { Component, ErrorInfo, ReactNode, Suspense } from 'react';
import { Loading, Message, Button } from '@alifd/next';

import './ErrorBoundary.less';

interface ErrorBoundaryProps {
  onCatch?: (error: Error, info: ErrorInfo) => void;
  // React 19：React.FC / 组件 props 不再隐式包含 children，需显式声明
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  info: null | ErrorInfo;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  static getDerivedStateFromError() {
    return { hasError: true };
  }

  state: ErrorBoundaryState = {
    hasError: false,
    info: null,
  };

  componentDidCatch(error: Error, info: ErrorInfo) {
    const { onCatch } = this.props;
    if (onCatch) {
      onCatch(error, info);
      this.setState({ info });
    }
  }

  render() {
    const { children } = this.props;
    const { hasError, info } = this.state;
    // 展示错误堆栈文本（原代码把 { stack } 对象直接当 ReactNode 渲染，属既有 bug）
    const errorStack = info?.componentStack || '';
    if (!hasError) {
      return <Suspense fallback={<Loading visible />}>{children}</Suspense>;
    }
    return (
      <Message title="出错了~" type="error">
        <p>详细错误: {errorStack || '未知原因'}</p>
        <div className="plugin-code-editor-errorBoundary-actions">
          <Button onClick={this._handleReset} size="small">
            重试
          </Button>
        </div>
      </Message>
    );
  }

  private _handleReset = () => {
    this.setState({ hasError: false });
  };
}
