// The home page at "/": what Sprout is, for judges, NGOs, donors and parents.
// Each section is its own file in components/landing/, in the order they appear.
import React from 'react';
import Hero from '../components/landing/Hero.jsx';
import HowItWorks from '../components/landing/HowItWorks.jsx';
import MeetMentor from '../components/landing/MeetMentor.jsx';
import Trust from '../components/landing/Trust.jsx';
import ComingSoon from '../components/landing/ComingSoon.jsx';
import Closing from '../components/landing/Closing.jsx';

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
