
import React from 'react';
import ReactDOM from 'react-dom/client';
import { PrivyProvider } from '@privy-io/react-auth';
import { Buffer } from 'buffer';
import { BrowserRouter } from 'react-router-dom';
import { config } from './config';
import App from './App';

if (typeof globalThis !== 'undefined' && !('Buffer' in globalThis)) {
  (globalThis as typeof globalThis & { Buffer?: typeof Buffer }).Buffer = Buffer;
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <PrivyProvider
    appId={config.privyAppId}
    config={{
      appearance: {
        logo: config.privyLogoUrl || undefined,
        landingHeader: 'Welcome to Moltrade',
        theme: 'light',
      },
      embeddedWallets: {
        ethereum: {
          createOnLogin: 'users-without-wallets',
        },
      },
    }}
  >
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </PrivyProvider>
);
