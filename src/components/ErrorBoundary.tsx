import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
  error: Error | null;
};

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {}

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-background px-4 py-10">
        <div className="mx-auto w-full max-w-xl space-y-4 rounded-2xl border bg-card p-6 shadow-sm">
          <h1 className="font-display text-2xl">Something went wrong</h1>
          <p className="text-sm text-muted-foreground">
            The app crashed while loading. Reload the page to try again.
          </p>
          {this.state.error ? (
            <pre className="max-h-48 overflow-auto rounded-xl border bg-muted p-3 text-xs text-muted-foreground">
              {this.state.error.message}
            </pre>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground"
              onClick={() => window.location.reload()}
            >
              Reload
            </button>
            <button
              type="button"
              className="inline-flex h-10 items-center justify-center rounded-md border px-4 text-sm font-semibold"
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              Try to continue
            </button>
          </div>
        </div>
      </div>
    );
  }
}

