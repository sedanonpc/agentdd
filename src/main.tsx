import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';
import { PrivyProvider } from '@privy-io/react-auth';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename="/">
      <PrivyProvider
        appId={import.meta.env.VITE_PRIVY_APP_ID}
        config={{
          loginMethods: ['email'],
          embeddedWallets: { createOnLogin: 'all-users' },
          // Do not enable any wallet-first flags; free-tier email only
        }}
      >
        <App />
      </PrivyProvider>
    </BrowserRouter>
  </StrictMode>
);