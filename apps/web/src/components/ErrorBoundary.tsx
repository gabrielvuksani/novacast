import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 text-center animate-fade-in">
          <div className="w-20 h-20 bg-error/10 rounded-3xl flex items-center justify-center mb-5">
            <AlertTriangle className="w-10 h-10 text-error" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Something went wrong</h2>
          <p className="text-text-secondary text-sm max-w-md mb-2">
            An unexpected error occurred. This is likely a temporary issue.
          </p>
          {this.state.error?.message && (
            <p className="text-text-tertiary text-xs max-w-md mb-6 font-mono bg-bg-tertiary rounded-lg px-3 py-2">
              {this.state.error.message}
            </p>
          )}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="btn-primary"
            >
              <RefreshCw className="w-4 h-4" aria-hidden="true" /> Reload Page
            </button>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.href = '/';
              }}
              className="btn-secondary"
            >
              <Home className="w-4 h-4" aria-hidden="true" /> Go Home
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
