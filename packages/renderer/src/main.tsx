import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { bootstrapRendererSentry } from '@/services/sentry';
import './index.css';

const renderApp = () => {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Renderer root element "#root" was not found');
  }

  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
};

const bootstrap = async () => {
  try {
    await bootstrapRendererSentry();
  } catch (error) {
    console.error('[Sentry] Failed to bootstrap renderer telemetry:', error);
  } finally {
    renderApp();
  }
};

void bootstrap();
