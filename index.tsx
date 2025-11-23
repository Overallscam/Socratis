import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Polyfill for process.env to prevent crashes in browser environments
// CRITICAL: Injecting the User's API Key here so it is available globally
if (typeof window !== 'undefined') {
  const win = window as any;
  if (!win.process) {
    win.process = { 
      env: {
        API_KEY: "AIzaSyA9sVYVJDLiMk57790CSw3syh0LM2nKZxU"
      } 
    };
  } else if (!win.process.env) {
     win.process.env = {
        API_KEY: "AIzaSyA9sVYVJDLiMk57790CSw3syh0LM2nKZxU"
     };
  } else {
    // Ensure key exists even if process.env exists
    win.process.env.API_KEY = "AIzaSyA9sVYVJDLiMk57790CSw3syh0LM2nKZxU";
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

interface ErrorBoundaryProps {
  children?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// React Error Boundary Component to catch render errors
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // Fix: Explicitly declare state and props to resolve TS errors
  public state: ErrorBoundaryState;
  public props: ErrorBoundaryProps;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
    this.props = props;
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("React Component Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          fontFamily: 'sans-serif',
          padding: '20px',
          color: '#7f1d1d',
          background: '#fef2f2',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center'
        }}>
          <h1 style={{ fontSize: '24px', marginBottom: '10px' }}>Something went wrong</h1>
          <p>The app encountered an error:</p>
          <pre style={{
            background: 'rgba(0,0,0,0.05)',
            padding: '15px',
            borderRadius: '8px',
            overflow: 'auto',
            maxWidth: '90%',
            textAlign: 'left',
            marginTop: '10px'
          }}>
            {this.state.error?.message}
          </pre>
          <button 
            onClick={() => window.location.reload()} 
            style={{
              marginTop: '20px',
              padding: '10px 20px',
              background: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            Reload App
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

try {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
} catch (error) {
  console.error("Critical Render Error:", error);
  document.body.innerHTML = `
    <div style="font-family: sans-serif; padding: 20px; color: #7f1d1d; background: #fef2f2; height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;">
      <h1 style="font-size: 24px; margin-bottom: 10px;">Critical Error</h1>
      <p>The app failed to start:</p>
      <pre style="background: rgba(0,0,0,0.05); padding: 15px; border-radius: 8px; overflow: auto; max-width: 90%; text-align: left;">${error instanceof Error ? error.message : String(error)}</pre>
    </div>
  `;
}