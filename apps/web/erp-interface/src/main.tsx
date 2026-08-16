import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './app/globals.css';
import { AuthProvider } from './lib/auth';
import './lib/i18n-config';
import { ToastHost } from './components/shared/ToastHost';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ToastHost />
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
