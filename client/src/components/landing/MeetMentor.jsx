// Home page, section 3: introduces Paisa Mentor with a short sample chat (fixed text, not AI).
// The live AI chat is on the demo page; the button links straight to it.
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import Mascot from '../Mascot.jsx';
import { Reveal } from '../../lib/motion.jsx';
import { icon } from '../../lib/icons.js';

export default function MeetMentor() {
  return (
    <section id="meet-mentor" className="section band band-yellow">
      <div className="container mentor-grid">
        <Reveal className="mentor-copy">
          <span className="tag tag-white">Paisa Mentor</span>
          <h2>
            A mentor.
            <br />
            Not a lecture.
          </h2>
          <p>
            Ask anything about money, in English or Hindi. Paisa Mentor answers like an older cousin
            who’s good with money, not like a textbook.
          </p>
          <Link className="btn btn-white" to="/app#mentor">
            Try it in the demo <ArrowRight {...icon} />
          </Link>
        </Reveal>
        <Reveal delay={0.1} className="mentor-sample">
          <div className="card chat-card">
            <div className="chat-head">
              <Mascot size={40} mood="think" />
              <div>
                <strong>Paisa Mentor</strong>
                <span>Sample chat</span>
              </div>
            </div>
            {/* lang="hi" helps screen readers pronounce the Hindi lines. */}
            <p className="bubble bubble-user" lang="hi">
              मैं साइकिल कब खरीद पाऊँगी?
            </p>
            <p className="bubble bubble-mentor" lang="hi">
              ₹100 हर महीने बचाकर लगभग 4 साल 3 महीने में। ₹250 बचाओ तो 2 साल से कम।
            </p>
            <p className="bubble bubble-user">Can I still buy snacks sometimes?</p>
            <p className="bubble bubble-mentor">
              Yes! That’s what your Spend jar is for. Saving works best when it doesn’t feel like a
              punishment.
            </p>
            <p className="chat-note">Sample replies. The live AI mentor is in the demo.</p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
