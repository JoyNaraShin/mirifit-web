import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  /** 오류 화면. reset 을 눌러 다시 시도하게 한다. */
  fallback: (error: Error, reset: () => void) => ReactNode;
  /** 라우트가 바뀌면 이전 오류를 들고 있지 않는다. */
  resetKey?: string;
  onReset?: () => void;
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * useSuspenseQuery 는 오류를 throw 하므로 경계가 없으면 화면 전체가 죽는다.
 * react-error-boundary 를 넣지 않고 직접 둔다 — 필요한 건 이 30줄뿐이다.
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidUpdate(prev: ErrorBoundaryProps) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // 데모 단계라 수집처가 없다 — 최소한 콘솔에는 남겨 원인 추적이 가능하게.
    console.error("[petfit] 화면 오류", error, info.componentStack);
  }

  private reset = () => {
    this.props.onReset?.();
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (error) return this.props.fallback(error, this.reset);
    return this.props.children;
  }
}
