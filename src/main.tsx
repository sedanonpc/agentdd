import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import { PrivyProvider } from '@privy-io/react-auth';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PrivyProvider
      appId={import.meta.env.VITE_PRIVY_APP_ID as string}
      config={{
        loginMethods: ['email'],
        embeddedWallets: { createOnLogin: 'all-users' },
      }}
    >
      <BrowserRouter basename="/">
        <App />
      </BrowserRouter>
    </PrivyProvider>
  </StrictMode>
);