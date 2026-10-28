import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in Universal Estimating & Valuation application:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleClearData = () => {
    if (confirm('This will reset local application cache and stored preferences to fix corrupted state. Proceed?')) {
      try {
        localStorage.clear();
        sessionStorage.clear();
        if ('caches' in window) {
          caches.keys().then((names) => {
            names.forEach((name) => caches.delete(name));
          });
        }
      } catch (e) {
        console.error('Error clearing cache:', e);
      }
      window.location.href = '/';
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
          <div className="max-w-xl w-full bg-slate-900 border border-red-500/30 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-orange-500 to-amber-500" />
            
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-black text-white tracking-tight uppercase">
                  Application Runtime Error
                </h1>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Universal Estimating & Valuation (UEV) • System Exception Recovery
                </p>
              </div>
            </div>

            <div className="bg-slate-950/80 rounded-xl p-4 border border-slate-800/80 mb-6 font-mono text-xs text-red-300 overflow-x-auto max-h-48 leading-relaxed">
              <div className="font-bold text-red-400 mb-1">
                {this.state.error?.toString() || 'Unknown Application Error'}
              </div>
              {this.state.errorInfo?.componentStack && (
                <div className="text-slate-500 text-[11px] whitespace-pre-wrap mt-2 pt-2 border-t border-slate-800">
                  {this.state.errorInfo.componentStack}
                </div>
              )}
            </div>

            <div className="text-sm text-slate-300 mb-6 space-y-2">
              <p>The application encountered an unexpected state or module loading error.</p>
              <p className="text-xs text-slate-400">
                You can attempt to reload the application, or reset cached data if stale browser state is causing the conflict.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 pt-2 border-t border-slate-800">
              <button
                onClick={this.handleReload}
                className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition shadow-lg shadow-indigo-600/20 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload Application</span>
              </button>

              <button
                onClick={this.handleClearData}
                className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-slate-700/60 transition cursor-pointer"
              >
                <Trash2 className="w-4 h-4 text-red-400" />
                <span>Reset Cache & Reset State</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
