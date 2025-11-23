import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

try {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (error) {
  console.error("Critical Render Error:", error);
  // Fallback UI if the app crashes completely
  document.body.innerHTML = `
    <div style="font-family: sans-serif; padding: 20px; color: #7f1d1d; background: #fef2f2; height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;">
      <h1 style="font-size: 24px; margin-bottom: 10px;">Something went wrong</h1>
      <p>The app could not load. Here is the error:</p>
      <pre style="background: rgba(0,0,0,0.05); padding: 15px; border-radius: 8px; overflow: auto; max-width: 90%; text-align: left;">${error instanceof Error ? error.message : String(error)}</pre>
      <button onclick="window.location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #dc2626; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 16px;">Reload App</button>
    </div>
  `;
}