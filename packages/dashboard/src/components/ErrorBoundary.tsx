/**
 * Error Boundary Component
 * Catches React errors and displays a fallback UI instead of blank screen.
 */

import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('[ErrorBoundary] Caught error:', error, errorInfo);
        this.setState({ errorInfo });
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100vh',
                    background: '#0a0a0a',
                    color: '#fff',
                    padding: '24px',
                    fontFamily: 'system-ui, sans-serif'
                }}>
                    <h1 style={{ color: '#ff3366', marginBottom: '16px' }}>Something went wrong</h1>
                    <p style={{ color: '#a1a1aa', marginBottom: '24px' }}>
                        An error occurred while loading this page.
                    </p>
                    <details style={{
                        background: '#141414',
                        padding: '16px',
                        borderRadius: '8px',
                        maxWidth: '600px',
                        width: '100%'
                    }}>
                        <summary style={{ cursor: 'pointer', color: '#00d4ff' }}>Error Details</summary>
                        <pre style={{
                            marginTop: '12px',
                            whiteSpace: 'pre-wrap',
                            fontSize: '12px',
                            color: '#ff6b6b'
                        }}>
                            {this.state.error?.message}
                            {'\n\n'}
                            {this.state.error?.stack}
                        </pre>
                    </details>
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            marginTop: '24px',
                            padding: '12px 24px',
                            background: '#00d4ff',
                            color: '#000',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: 'bold'
                        }}
                    >
                        Reload Page
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
