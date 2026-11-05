// Shown for any address that isn't a real page, with a way back home.
import React from 'react';
import { Link } from 'react-router-dom';
import Mascot from '../components/Mascot.jsx';
import { site } from '../content/site.js';

export default function NotFound() {
  return (
    <section className="section not-found">
      <div className="container narrow center">
        <Mascot mood="think" size={120} />
        <h1>{site.notFound.title}</h1>
        <p>{site.notFound.text}</p>
        <Link className="btn btn-green" to="/">
          {site.notFound.button}
        </Link>
      </div>
    </section>
  );
}
