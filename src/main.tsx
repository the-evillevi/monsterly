import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './styles.css';
import App from './App.tsx';
import { RepositoryProvider } from '@/lib/repositories/repository-provider';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <RepositoryProvider>
        <App />
      </RepositoryProvider>
    </BrowserRouter>
  </StrictMode>,
);
