import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import { PrivyProvider } from '@privy-io/react-auth';
import './index.css';

const privyAppId = import.meta.env.VITE_PRIVY_APP_ID as string | undefined;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {privyAppId ? (
      <PrivyProvider
        appId={privyAppId}
        config={{
          loginMethods: ['email'],
          embeddedWallets: { createOnLogin: 'all-users' },
        }}
      >
        <BrowserRouter basename="/">
          <App />
        </BrowserRouter>
      </PrivyProvider>
    ) : (
      <BrowserRouter basename="/">
        {console.warn('VITE_PRIVY_APP_ID missing; rendering without PrivyProvider')}
        <App />
      </BrowserRouter>
    )}
  </StrictMode>
);