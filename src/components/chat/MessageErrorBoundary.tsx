import { Component, type ErrorInfo, type ReactNode } from 'react';
import { I18nContext } from '../../i18n';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class MessageErrorBoundary extends Component<Props, State> {
  static contextType = I18nContext;
  declare context: React.ContextType<typeof I18nContext>;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('MessageErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="border border-red-500/50 bg-red-900/20 rounded-lg p-4 my-2">
          <div className="flex items-center gap-2">
            <span className="text-red-400">⚠️</span>
            <span className="text-red-300 text-sm">
              {this.context?.t('error.renderMessage') ?? 'This message could not be rendered'}
            </span>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
