import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';

interface Props {
  children: ReactNode;
  routeName?: string;
  backPath?: string;
  backLabel?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class RouteErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`RouteErrorBoundary [${this.props.routeName || 'Unknown'}]:`, error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  handleBack = () => {
    window.location.href = this.props.backPath || '/driver/home';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <div className="max-w-sm w-full text-center">
            <div className="w-12 h-12 mx-auto mb-4 bg-red-500/20 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>
            
            <h2 
              className="text-lg font-semibold text-white mb-2 uppercase tracking-wider"
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              {this.props.routeName ? `${this.props.routeName} Error` : 'Something went wrong'}
            </h2>
            
            <p className="text-white/50 text-sm mb-6">
              This section encountered an error. You can try again or go back.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded text-left">
                <p className="text-xs text-red-400 font-mono break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={this.handleBack}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white/[0.05] hover:bg-white/[0.10] border border-white/[0.10] rounded text-sm text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                {this.props.backLabel || 'Go Back'}
              </button>
              <button
                onClick={this.handleRetry}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#f97316] hover:bg-[#ea580c] rounded text-sm text-white font-semibold transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Retry
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default RouteErrorBoundary;
