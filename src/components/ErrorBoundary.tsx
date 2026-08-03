import { Component, ReactNode } from 'react';
import { reportError } from '@/lib/errorReporter';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Home } from 'lucide-react';

interface Props { children: ReactNode }
interface State { hasError: boolean; message?: string; countdown: number }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, countdown: 4 };
  timer: any = null;

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message, countdown: 4 };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    void reportError(error, { metadata: { component_stack: info.componentStack?.slice(0, 2000) } });
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    if (this.state.hasError && !prevState.hasError) {
      this.startRedirectCountdown();
    }
  }

  componentWillUnmount() {
    if (this.timer) clearInterval(this.timer);
  }

  getStoreHomePath = () => {
    const path = window.location.pathname;
    if (path.startsWith('/store/')) {
      const parts = path.split('/');
      if (parts.length >= 3) {
        return `/store/${parts[2]}`;
      }
    }
    return '/';
  };

  startRedirectCountdown = () => {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      this.setState(
        (prev) => ({ countdown: prev.countdown - 1 }),
        () => {
          if (this.state.countdown <= 0) {
            clearInterval(this.timer);
            window.location.href = this.getStoreHomePath();
          }
        }
      );
    }, 1000);
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    const homePath = this.getStoreHomePath();

    return (
      <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full text-center space-y-5 bg-white dark:bg-stone-900 border rounded-2xl p-8 shadow-sm">
          <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-black text-stone-900 dark:text-stone-100">Oops! Something went wrong</h2>
            <p className="text-xs text-muted-foreground">
              We encountered an unexpected crash. Redirecting to store home in <span className="font-extrabold text-orange-500">{this.state.countdown}s</span>...
            </p>
          </div>
          
          {this.state.message && (
            <div className="text-[10px] bg-stone-50 dark:bg-stone-950 p-3 rounded-lg font-mono text-left text-destructive overflow-auto max-h-24 border">
              {this.state.message}
            </div>
          )}

          <div className="flex gap-2 justify-center pt-2">
            <Button 
              size="sm"
              className="bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs rounded-xl"
              onClick={() => {
                window.location.href = homePath;
              }}
            >
              <Home className="h-4 w-4 mr-1.5" /> Go to Home
            </Button>
            <Button 
              size="sm"
              variant="outline" 
              className="font-bold text-xs rounded-xl"
              onClick={() => { 
                this.setState({ hasError: false }); 
                history.back(); 
              }}
            >
              Go Back
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
