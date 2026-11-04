import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
// Bricolage Grotesque with its optical-size axis: chunky at headline sizes, calmer at body sizes.
import '@fontsource-variable/bricolage-grotesque/opsz.css';
import 'lenis/dist/lenis.css';
import App from './App.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
