import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(_error: Error, _errorInfo: ErrorInfo) {
    // Keep the learner-facing fallback calm; diagnostics remain available to React in development.
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="error-page content-container">
          <section className="feedback-card feedback-card--error" aria-labelledby="application-error-title">
            <span aria-hidden="true">!</span>
            <div>
              <h1 id="application-error-title">Etwas ist schiefgelaufen.</h1>
              <p>Bitte lade die Seite neu und versuche es noch einmal.</p>
            </div>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
