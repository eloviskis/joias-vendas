import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Desregistrar Service Worker anterior se existir
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(reg => reg.unregister());
  });
}

createRoot(document.getElementById('root')!).render(<App />);
