// The website's starting point: loads the font, smooth-scroll styles and our CSS, then shows
// <App /> inside the router (which picks the page from the address bar).
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
// Bricolage Grotesque with its optical-size axis: chunky at headline sizes, calmer at body sizes.
import '@fontsource-variable/bricolage-grotesque/opsz.css';
import 'lenis/dist/lenis.css';
import App from './App.jsx';
import './styles.css';
import './ngo.css';
import './seedlings.css';
import './guardian.css';
import './presentation.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
