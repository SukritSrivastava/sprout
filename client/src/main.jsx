// The website's starting point: loads the font, smooth-scroll styles and our CSS, then shows
// <App /> inside the router (which picks the page from the address bar).
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
// Bricolage Grotesque with its optical-size axis: chunky at headline sizes, calmer at body sizes.
import '@fontsource-variable/bricolage-grotesque/opsz.css';
import 'lenis/dist/lenis.css';
import App from './app/App.jsx';
import { LanguageProvider } from './features/language/language.jsx';
import './shared/styles.css';
import './features/ngo/styles.css';
import './features/seedlings/styles.css';
import './features/guardian/styles.css';
import './features/presentation/styles.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
