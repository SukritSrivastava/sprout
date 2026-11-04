// Paisa Mentor: a live AI chat (Gemini, through our server). Replies stream in word by word.
// If the AI or the server is unavailable, prepared answers keep the demo working, clearly tagged.
import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowUp, RotateCcw, ShieldAlert } from 'lucide-react';
import Mascot from '../Mascot.jsx';
import { Reveal, ease } from '../../lib/motion.jsx';
import { askMentor, mentorStatus, MentorError } from '../../lib/mentorApi.js';
import { mentorText, offlineAnswer } from '../../lib/content.js';

const MAX = 600;
const HISTORY = 12; // the server accepts at most 12 messages

const statusLabel = {
  checking: ['Connecting…', 'tag-white'],
  live: ['Live AI', 'tag-green'],
  offline: ['Offline mode', 'tag-yellow'],
  unreachable: ['Offline mode', 'tag-yellow'],
};

function Bubble({ message, words }) {
  const fromUser = message.role === 'user';
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
      {message.source === 'prepared' && !message.streaming && (
        <span className="bubble-tag">Prepared answer</span>
      )}
      {message.flagged && !message.streaming && (
        <div className="adult-card" role="note">
          <ShieldAlert size={22} strokeWidth={2.75} aria-hidden="true" />
          <div>
            <strong>{words.adultTitle}</strong>
            <p>{words.adultText}</p>
          </div>
        </div>
      )}
    </motion.div>
  );
}

export default function Mentor({ context }) {
  const [language, setLanguage] = useState('en');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [suggestions, setSuggestions] = useState(null);
  const [status, setStatus] = useState('checking');
  const logRef = useRef(null);
  const abortRef = useRef(null);
  const words = mentorText[language];

  useEffect(() => {
    mentorStatus().then(setStatus);
    return () => abortRef.current?.abort();
  }, []);

  // Keep the newest message in view as text streams in.
  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [messages]);

  // Change only the last (mentor) message.
  const updateLast = (change) =>
    setMessages((list) => [...list.slice(0, -1), { ...list[list.length - 1], ...change(list[list.length - 1]) }]);

  async function send(raw) {
    const text = raw.trim().slice(0, MAX);
    if (!text || busy) return;
    setInput('');
    setNotice('');
    setBusy(true);
    const history = [...messages.filter((m) => m.text), { role: 'user', text }]
      .slice(-HISTORY)
      .map(({ role, text: body }) => ({ role, text: body }));
    setMessages((list) => [
      ...list,
      { role: 'user', text, lang: language },
      { role: 'mentor', text: '', lang: language, streaming: true },
    ]);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      await askMentor({
        language,
        messages: history,
        context,
        signal: controller.signal,
        onStart: ({ source, flagged }) => updateLast(() => ({ source, flagged })),
        onDelta: (piece) => updateLast((last) => ({ text: last.text + piece })),
        onDone: ({ suggestions: next }) => setSuggestions(next),
      });
      updateLast(() => ({ streaming: false }));
    } catch (error) {
      if (error.name === 'AbortError') return;
      if (error instanceof MentorError && (error.status === 400 || error.status === 429)) {
        // Our mistake or too many messages: remove the empty reply and explain.
        setMessages((list) => list.slice(0, -1));
        setNotice(error.message);
      } else {
        // Server unreachable or broken: answer from the prepared set so the demo carries on.
        setStatus('unreachable');
        updateLast(() => ({ text: offlineAnswer(text, language), source: 'prepared', streaming: false }));
        setNotice(words.offline);
      }
    } finally {
      setBusy(false);
    }
  }

  const clear = () => {
    abortRef.current?.abort();
    setMessages([]);
    setSuggestions(null);
    setNotice('');
    setBusy(false);
  };

  const shownSuggestions = suggestions ?? words.suggestions;
  const [label, tone] = statusLabel[status];
  const thinking = busy && messages[messages.length - 1]?.text === '';

  return (
    <section id="mentor" className="section band band-yellow">
      <div className="container mentor-grid">
        <Reveal className="mentor-copy">
          <span className="tag tag-white">Ask anything</span>
          <h2>Paisa Mentor.</h2>
          <p>
            A real AI mentor that answers money questions in plain words, in English or Hindi. It
            knows your sample jars and goal, and it will never ask for personal details.
          </p>
          <Mascot mood={thinking ? 'think' : 'happy'} size={110} label="Sprout listening" />
        </Reveal>
        <Reveal delay={0.1} className="card chat-card chat-live">
          <div className="chat-head">
            <Mascot size={40} mood={thinking ? 'think' : 'happy'} />
            <div>
              <strong>Paisa Mentor</strong>
              <span className={`tag ${tone} status-tag`}>{label}</span>
            </div>
            <div className="chat-tools">
              <div className="lang-switch" role="group" aria-label="Reply language">
                {[
                  ['en', 'English'],
                  ['hi', 'हिंदी'],
                ].map(([code, name]) => (
                  <button
                    key={code}
                    className="chip chip-sm"
                    aria-pressed={language === code}
                    onClick={() => {
                      setLanguage(code);
                      setSuggestions(null);
                    }}
                  >
                    {name}
                  </button>
                ))}
              </div>
              <button className="icon-btn" aria-label="Clear chat" onClick={clear}>
                <RotateCcw size={18} strokeWidth={2.75} aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="chat-log" ref={logRef} role="log" aria-live="polite" data-lenis-prevent>
            <div className="chat-row from-mentor">
              <p className="bubble bubble-mentor" lang={language}>
                {words.greeting}
              </p>
            </div>
            {messages.map((message, i) => (
              <Bubble key={i} message={message} words={words} />
            ))}
          </div>

          <AnimatePresence>
            {notice && (
              <motion.p
                className="chat-notice"
                role="status"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                {notice}
              </motion.p>
            )}
          </AnimatePresence>

          <div className="question-list" aria-label="Suggested questions">
            {shownSuggestions.map((text) => (
              <button key={text} className="chip" disabled={busy} onClick={() => send(text)} lang={language}>
                {text}
              </button>
            ))}
          </div>

          <form
            className="chat-form"
            onSubmit={(event) => {
              event.preventDefault();
              send(input);
            }}
          >
            <label htmlFor="mentor-input" className="sr-only">
              Your question
            </label>
            <textarea
              id="mentor-input"
              rows={2}
              maxLength={MAX}
              value={input}
              placeholder={words.placeholder}
              lang={language}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                // Enter sends; Shift+Enter makes a new line.
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  send(input);
                }
              }}
            />
            <div className="chat-form-foot">
              <span className="hint">
                {input.length}/{MAX}
              </span>
              <button className="btn btn-green btn-sm" type="submit" disabled={busy || !input.trim()}>
                {words.send} <ArrowUp size={18} strokeWidth={2.75} aria-hidden="true" />
              </button>
            </div>
          </form>
          <p className="chat-note">AI · can make mistakes. {words.privacy}</p>
        </Reveal>
      </div>
    </section>
  );
}
