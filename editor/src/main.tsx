import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App.tsx';

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      {/* SPA is mounted under /editor (Cloudflare path routing). */}
      <BrowserRouter basename="/editor">
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
