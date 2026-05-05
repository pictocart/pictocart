import { Component, ReactNode } from 'react';
import { reportError } from '@/lib/errorReporter';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface Props { children: ReactNode }
interface State { hasError: boolean; message?: string }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    void reportError(error, { metadata: { component_stack: info.componentStack?.slice(0, 2000) } });
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-semibold">Something went wrong</h2>
          <p className="text-sm text-muted-foreground">{this.state.message ?? 'An unexpected error occurred.'}</p>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => location.reload()}>Reload page</Button>
            <Button variant="outline" onClick={() => { this.setState({ hasError: false }); history.back(); }}>Go back</Button>
          </div>
        </div>
      </div>
    );
  }
}
