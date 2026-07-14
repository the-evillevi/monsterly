import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './styles.css';
import App from './App.tsx';
import { CheckInDialogProvider } from '@/components/check-ins/check-in-dialog-provider';
import { ThemeProvider } from '@/components/theme-provider';
import { DataLayerProvider } from '@/lib/data/data-layer-provider';
import { SyncProvider } from '@/lib/sync/sync-provider';
import { appUpdateManager } from '@/pwa/app-update';
import { startBuildChannel } from '@/pwa/build-channel';

appUpdateManager.start();
startBuildChannel();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <DataLayerProvider>
          <SyncProvider>
            <CheckInDialogProvider>
              <App />
            </CheckInDialogProvider>
          </SyncProvider>
        </DataLayerProvider>
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
);
