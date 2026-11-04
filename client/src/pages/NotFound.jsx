import React from 'react';
import { Link } from 'react-router-dom';
import Mascot from '../components/Mascot.jsx';

export default function NotFound() {
  return (
    <section className="section not-found">
      <div className="container narrow center">
        <Mascot mood="think" size={120} />
        <h1>This page didn’t sprout.</h1>
        <p>The link may be old or mistyped.</p>
        <Link className="btn btn-green" to="/">
          Back to the home page
        </Link>
      </div>
    </section>
  );
}
