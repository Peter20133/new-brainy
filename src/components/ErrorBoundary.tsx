import { Component, ReactNode, ErrorInfo } from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  onReset?: () => void;
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

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="card my-6 p-6 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
            <AlertCircle size={24} />
          </div>
          <h3 className="text-base font-bold text-slate-800">A apărut o problemă neașteptată</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {this.state.error?.message || 'Pagina a întâmpinat o eroare la afișare.'}
          </p>
          <div className="pt-2 flex justify-center">
            <button
              type="button"
              onClick={this.handleReset}
              className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5"
            >
              <RotateCcw size={14} />
              <span>Reîncarcă pagina</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
