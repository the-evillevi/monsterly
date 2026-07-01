import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './styles.css';
import App from './App.tsx';
import { DataLayerProvider } from '@/lib/data/data-layer-provider';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <DataLayerProvider>
        <App />
      </DataLayerProvider>
    </BrowserRouter>
  </StrictMode>,
);
