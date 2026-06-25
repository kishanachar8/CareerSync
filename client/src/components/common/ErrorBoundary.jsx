import { Component } from 'react';

class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('Unhandled render error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center text-center p-6 sm:p-8 bg-canvas">
          <h1 className="text-2xl font-bold text-ink">Something went wrong</h1>
          <p className="text-ink-muted mt-2">Please refresh the page. If the problem persists, try again later.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 px-6 py-2.5 bg-gradient-brand text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
