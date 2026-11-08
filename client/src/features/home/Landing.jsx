// The home page at "/": what Sprout is, for judges, NGOs, donors and parents.
// Each section lives beside this page, in the order it appears.

import React from 'react';
import Hero from './Hero.jsx';
import HowItWorks from './HowItWorks.jsx';
import MeetMentor from './MeetMentor.jsx';
import Trust from './Trust.jsx';
import ComingSoon from './ComingSoon.jsx';
import Closing from './Closing.jsx';

export default function Landing({ onTour }) {
  return (
    <>
      <Hero onTour={onTour} />
      <HowItWorks />
      <MeetMentor />
      <Trust />
      <ComingSoon />
      <Closing />
    </>
  );
}
