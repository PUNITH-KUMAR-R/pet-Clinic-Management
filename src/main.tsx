import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Silence benign Vite HMR websocket connection errors and unhandled rejections
if (typeof window !== 'undefined') {
  const isWebSocketError = (err: unknown) => {
    if (!err) return false;
    const msg = typeof err === 'string' ? err : (err && typeof err === 'object' && 'message' in err ? String((err as { message: unknown }).message) : '');
    return (
      msg.includes('WebSocket') ||
      msg.includes('websocket') ||
      msg.includes('connection failed') ||
      msg.includes('HMR')
    );
  };

  window.addEventListener('unhandledrejection', (event) => {
    if (isWebSocketError(event.reason) || isWebSocketError(event.reason?.message)) {
      event.preventDefault();
      event.stopPropagation();
    }
  });

  window.addEventListener('error', (event) => {
    if (isWebSocketError(event.message) || isWebSocketError(event.error)) {
      event.preventDefault();
      event.stopPropagation();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

