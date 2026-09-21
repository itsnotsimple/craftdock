import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[CraftDock ErrorBoundary] Caught render error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="h-full w-full flex items-center justify-center p-8">
          <div className="max-w-md w-full p-6 rounded-2xl border border-rose-500/30 bg-rose-950/20 backdrop-blur-xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 mx-auto flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">
                {this.props.fallbackTitle || 'Възникна неочаквана грешка / Unexpected Error'}
              </h3>
              <p className="text-xs text-rose-300/80 font-mono mt-2 bg-black/40 p-2.5 rounded-xl text-left overflow-x-auto">
                {this.state.error?.message || 'Unknown error occurred.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 transition-all inline-flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Опитай отново / Try Again</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
