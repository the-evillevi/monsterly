import { Route, Routes } from 'react-router-dom';

import { AppShell } from '@/components/app-shell';
import { RequireAuth } from '@/components/require-auth';
import { AuthCallbackPage } from '@/pages/auth-callback-page';
import { LoginPage } from '@/pages/login-page';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route
        path="/*"
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      />
    </Routes>
  );
}

export default App;
