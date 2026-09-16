import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { LanguageProvider } from './context/LanguageContext';
import { DialogProvider } from './context/DialogContext';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <LanguageProvider>
      <DialogProvider>
        <App />
      </DialogProvider>
    </LanguageProvider>
  </React.StrictMode>
);

