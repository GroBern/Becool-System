import React from 'react';

type Props = { children: React.ReactNode };
type State = { error: Error | null };

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('App error boundary caught:', error, info.componentStack);
  }

  handleReload = () => {
    this.setState({ error: null });
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-900 p-6 text-white">
        <div className="max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur">
          <div className="mb-3 text-5xl">⚠️</div>
          <h1 className="mb-2 text-xl font-bold">Something went wrong</h1>
          <p className="mb-5 text-sm text-white/70">
            {this.state.error.message || 'Unexpected error'}
          </p>
          <button
            onClick={this.handleReload}
            className="rounded-full bg-sky-500 px-6 py-2 text-sm font-semibold hover:bg-sky-400"
          >
            Reload app
          </button>
        </div>
      </div>
    );
  }
}
