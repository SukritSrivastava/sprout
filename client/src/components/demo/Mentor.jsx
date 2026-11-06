// Paisa Mentor: the live AI chat section of the demo (Gemini, through our server).
// This file is only the layout. The chat logic (sending, streaming, errors, offline answers)
// lives in lib/useMentorChat.js, and each message is drawn by ChatBubble.jsx.
// Words: src/content/demo.js → demo.mentor and mentorText.
import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowUp, RotateCcw } from 'lucide-react';
import Mascot from '../Mascot.jsx';
import ChatBubble from './ChatBubble.jsx';
import { Reveal } from '../../lib/motion.jsx';
import { iconSized } from '../../lib/icons.js';
import { demo, mentorText } from '../../content/demo.js';
import { MAX_QUESTION_LENGTH, useMentorChat } from '../../lib/useMentorChat.js';

// What the little status tag says, and its colour.
const text = demo.mentor;
const statusLabel = {
  checking: [text.status.checking, 'tag-white'],
  live: [text.status.live, 'tag-green'],
  offline: [text.status.offline, 'tag-yellow'],
  unreachable: [text.status.offline, 'tag-yellow'],
};
const languages = [
  ['en', 'English'],
  ['hi', 'हिंदी'],
];

export default function Mentor({ context }) {
  const [language, setLanguage] = useState('en');
  const [input, setInput] = useState('');
  const chat = useMentorChat({ language, context });
  const words = mentorText[language];
  const logRef = useRef(null);

  // Keep the newest message in view as text streams in.
  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [chat.messages]);

  const ask = (text) => {
    if (chat.busy || !text.trim()) return;
    setInput('');
    chat.send(text);
  };

  const [statusText, statusTone] = statusLabel[chat.status];
  const mood = chat.thinking ? 'think' : 'happy';

  return (
    <section id="mentor" className="section band band-yellow">
      <div className="container mentor-grid">
        <Reveal className="mentor-copy">
          <span className="tag tag-white">{text.tag}</span>
          <h2>{text.title}</h2>
          <p>{text.text}</p>
          <Mascot mood={mood} size={110} label="Sprout listening" />
        </Reveal>

        <Reveal delay={0.1} className="card chat-card chat-live">
          <div className="chat-head">
            <Mascot size={40} mood={mood} />
            <div>
              <strong>{text.name}</strong>
              <span className={`tag ${statusTone} status-tag`}>{statusText}</span>
            </div>
            <div className="chat-tools">
              <div className="lang-switch" role="group" aria-label="Reply language">
                {languages.map(([code, name]) => (
                  <button
                    key={code}
                    className="chip chip-sm"
                    aria-pressed={language === code}
                    onClick={() => setLanguage(code)}
                  >
                    {name}
                  </button>
                ))}
              </div>
              <button className="icon-btn" aria-label="Clear chat" onClick={chat.clear}>
                <RotateCcw {...iconSized(18, 2.75)} />
              </button>
            </div>
          </div>

          {/* data-lenis-prevent lets the mouse wheel scroll this box instead of the page. */}
          <div className="chat-log" ref={logRef} role="log" aria-live="polite" data-lenis-prevent>
            <div className="chat-row from-mentor">
              <p className="bubble bubble-mentor" lang={language}>
                {words.greeting}
              </p>
            </div>
            {chat.messages.map((message) => (
              <ChatBubble key={message.id} message={message} words={words} />
            ))}
          </div>

          <AnimatePresence>
            {chat.notice && (
              <motion.p
                className="chat-notice"
                role="status"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                {chat.notice}
              </motion.p>
            )}
          </AnimatePresence>

          <div className="question-list" aria-label="Suggested questions">
            {(chat.suggestions ?? words.suggestions).map((text) => (
              <button key={text} className="chip" disabled={chat.busy} onClick={() => ask(text)} lang={language}>
                {text}
              </button>
            ))}
          </div>

          <form
            className="chat-form"
            onSubmit={(event) => {
              event.preventDefault();
              ask(input);
            }}
          >
            <label htmlFor="mentor-input" className="sr-only">
              Your question
            </label>
            <textarea
              id="mentor-input"
              rows={2}
              maxLength={MAX_QUESTION_LENGTH}
              value={input}
              placeholder={words.placeholder}
              lang={language}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                // Enter sends; Shift+Enter makes a new line.
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  ask(input);
                }
              }}
            />
            <div className="chat-form-foot">
              <span className="hint">
                {input.length}/{MAX_QUESTION_LENGTH}
              </span>
              <button className="btn btn-green btn-sm" type="submit" disabled={chat.busy || !input.trim()}>
                {words.send} <ArrowUp {...iconSized(18, 2.75)} />
              </button>
            </div>
          </form>
          <p className="chat-note">
            {text.note} {words.privacy}
          </p>
        </Reveal>
      </div>
    </section>
  );
}
