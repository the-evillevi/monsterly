import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './styles.css';
import App from './App.tsx';
import { RepositoryProvider } from '@/lib/repositories/repository-provider';
import { SyncProvider } from '@/lib/sync/sync-provider';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <RepositoryProvider>
        <SyncProvider>
          <App />
        </SyncProvider>
      </RepositoryProvider>
    </BrowserRouter>
  </StrictMode>,
);
