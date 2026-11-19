import React, { Component } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-center justify-center mx-auto text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white font-heading">
                Something went wrong
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                An unexpected error occurred while rendering this view.
              </p>
            </div>
            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={this.handleReset}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer inline-flex items-center"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                Try Again
              </button>
              <button
                type="button"
                onClick={() => { window.location.href = '/'; }}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all cursor-pointer inline-flex items-center"
              >
                <Home className="w-3.5 h-3.5 mr-1.5" />
                Go to Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

