// The brain of the Paisa Mentor chat, kept apart from how it looks (components/demo/Mentor.jsx).
//
// It keeps the list of messages, sends a question to the server, and adds the reply to the last
// message piece by piece as it streams in. If anything goes wrong it either explains (too many
// questions, a bad message) or answers from the prepared set so the demo never gets stuck.
import { useEffect, useRef, useState } from 'react';
import { askMentor, mentorStatus, MentorError } from './mentorApi.js';
import { mentorText, offlineAnswer } from './content.js';

export const MAX_QUESTION_LENGTH = 600;
const HISTORY = 12; // the server accepts at most 12 messages

// `context` is the demo's sample jars and goal, sent with every question.
export function useMentorChat({ language, context }) {
  // Each message: { role: 'user' | 'mentor', text, lang, streaming?, source?, flagged? }
  const [messages, setMessages] = useState([]);
  const [busy, setBusy] = useState(false); // true while waiting for or reading a reply
  const [notice, setNotice] = useState(''); // a short explanation shown above the input
  const [suggestions, setSuggestions] = useState(null); // null = use the default list
  const [status, setStatus] = useState('checking'); // 'checking' | 'live' | 'offline' | 'unreachable'
  const abortRef = useRef(null);

  // Ask the server once whether the AI is available; cancel any reply if the chat goes away.
  useEffect(() => {
    mentorStatus().then(setStatus);
    return () => abortRef.current?.abort();
  }, []);

  // New language, so go back to that language's starter suggestions.
  useEffect(() => setSuggestions(null), [language]);

  // Change only the last message (the mentor reply being written).
  const updateLast = (change) =>
    setMessages((list) => {
      const last = list[list.length - 1];
      return [...list.slice(0, -1), { ...last, ...change(last) }];
    });

  async function send(raw) {
    const text = raw.trim().slice(0, MAX_QUESTION_LENGTH);
    if (!text || busy) return false;
    setNotice('');
    setBusy(true);
    // What the server sees: earlier messages that have text, plus this question.
    const history = [...messages.filter((m) => m.text), { role: 'user', text }]
      .slice(-HISTORY)
      .map(({ role, text: body }) => ({ role, text: body }));
    // Show the question straight away, and an empty reply that fills in as words arrive.
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
      if (error.name === 'AbortError') return true; // the chat was cleared on purpose
      if (error instanceof MentorError && (error.status === 400 || error.status === 429)) {
        // A bad message or too many questions: remove the empty reply and explain.
        setMessages((list) => list.slice(0, -1));
        setNotice(error.message);
      } else {
        // Server unreachable or broken: answer from the prepared set so the demo carries on.
        setStatus('unreachable');
        updateLast(() => ({ text: offlineAnswer(text, language), source: 'prepared', streaming: false }));
        setNotice(mentorText[language].offline);
      }
    } finally {
      setBusy(false);
    }
    return true;
  }

  function clear() {
    abortRef.current?.abort();
    setMessages([]);
    setSuggestions(null);
    setNotice('');
    setBusy(false);
  }

  // Sprout looks thoughtful until the first words of a reply arrive.
  const thinking = busy && messages[messages.length - 1]?.text === '';

  return { messages, busy, notice, suggestions, status, thinking, send, clear };
}
