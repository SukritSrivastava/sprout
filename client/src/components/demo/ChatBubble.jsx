// One message in the mentor chat. A mentor reply with no text yet shows the "typing" dots; while
// it streams in, a blinking caret follows the words. Labels show when an answer was prepared
// (not AI), and a "talk to a trusted adult" card appears for sensitive topics.
import React from 'react';
import { motion } from 'motion/react';
import { ShieldAlert } from 'lucide-react';
import { ease } from '../../lib/motion.jsx';
import { iconSized } from '../../lib/icons.js';

export default function ChatBubble({ message, words }) {
  const fromUser = message.role === 'user';
  const finished = !message.streaming;
  return (
    <motion.div
      className={`chat-row ${fromUser ? 'from-user' : 'from-mentor'}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease }}
    >
      {message.text ? (
        <p className={`bubble ${fromUser ? 'bubble-user' : 'bubble-mentor'}`} lang={message.lang}>
          {message.text}
          {message.streaming && <span className="caret" aria-hidden="true" />}
        </p>
      ) : (
        <p className="bubble bubble-mentor typing" aria-label="Paisa Mentor is typing">
          <span />
          <span />
          <span />
        </p>
      )}
      {message.source === 'prepared' && finished && <span className="bubble-tag">Prepared answer</span>}
      {/* Shown straight away, not after the reply finishes: help shouldn't wait for the network. */}
      {message.flagged && (
        <div className="adult-card" role="note">
          <ShieldAlert {...iconSized(22, 2.75)} />
          <div>
            <strong>{words.adultTitle}</strong>
            <p>{words.adultText}</p>
          </div>
        </div>
      )}
    </motion.div>
  );
}
