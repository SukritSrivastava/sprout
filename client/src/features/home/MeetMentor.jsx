// Home page, section 3: introduces Paisa Mentor with a short sample chat (fixed text, not AI).
// The live AI chat is on the demo page; the button links straight to it.
// Words: src/content/home.js → home.mentor.
import { useLanguage } from '../language/language.jsx';
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import Mascot from '../../shared/components/Mascot.jsx';
import { Reveal } from '../../shared/motion.jsx';
import { icon } from '../../shared/icons.js';
import { home as homeEnglish } from '../../content/home.js';

export default function MeetMentor() {
  const { t, content, language } = useLanguage();
  const home = content(homeEnglish);
  const text = home.mentor;

  return (
    <section id="meet-mentor" className="section band band-yellow">
      <div className="container mentor-grid">
        <Reveal className="mentor-copy">
          <span className="tag tag-white">{text.tag}</span>
          <h2>
            {text.title[0]}
            <br />
            {text.title[1]}
          </h2>
          <p>{text.text}</p>
          <Link className="btn btn-white" to="/app#mentor">
            {text.button} <ArrowRight {...icon} />
          </Link>
        </Reveal>
        <Reveal delay={0.1} className="mentor-sample">
          <div className="card chat-card">
            <div className="chat-head">
              <Mascot size={40} mood="think" />
              <div>
                <strong>{text.chatName}</strong>
                <span>{text.chatSubtitle}</span>
              </div>
            </div>
            {text.sampleChat.map((line) => (
              <p
                key={line.text}
                className={`bubble bubble-${line.from}`}
                lang={language === 'hi' ? 'hi' : line.lang}
              >
                {t(line.text)}
              </p>
            ))}
            <p className="chat-note">{text.note}</p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
