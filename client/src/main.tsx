import '@/i18n';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from '@/app/App';
import '@/styles/index.css';

const container = document.getElementById('root');

if (!container) {
  throw new Error('Root element #root was not found in document');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
