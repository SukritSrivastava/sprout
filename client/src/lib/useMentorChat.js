// The brain of the Paisa Mentor chat, kept apart from how it looks (components/demo/Mentor.jsx).
//
// It keeps the list of messages, sends a question to the server, and adds the reply to its
// message piece by piece as it streams in. If anything goes wrong it either explains (too many
// questions, a bad message, an answer cut short) or answers from the prepared set so the demo
// never gets stuck.
//
// Every message has its own id, and every chat has a "round" number that goes up when the chat is
// cleared. A late reply from a cleared chat checks its round and quietly does nothing, so it can't
// write into the new chat or unlock the Send button too early.
import { useContext, useEffect, useRef, useState } from 'react';
import { LearningRevision, usePermission } from './permission.jsx';
import { askMentor, mentorStatus, MentorError } from './mentorApi.js';
import { isSensitive } from './safety.js';
import { mentorText, offlineAnswers } from '../content/demo.js';

export const MAX_QUESTION_LENGTH = 600;
const HISTORY = 12; // the server accepts at most 12 messages
const MAX_REPLY_IN_HISTORY = 1000; // the server accepts earlier mentor replies up to this length

// Last resort when the server can't be reached: the closest backup answer from content/demo.js.
// A sensitive question with no matching topic answer gets the "talk to a trusted adult" reply.
// (The trusted-adult card shows for every sensitive question either way.)
function offlineAnswer(question, language, sensitive) {
  const match = language === 'en' && offlineAnswers.en.find(({ words }) => words.test(question.toLowerCase()));
  if (match) return match.answer;
  if (sensitive) return offlineAnswers.sensitive[language];
  return language === 'hi' ? offlineAnswers.hiDefault : offlineAnswers.enDefault;
}

let nextId = 1;

// `context` is the demo's sample jars and goal, sent with every question.
export function useMentorChat({ language, context }) {
  const revision = useContext(LearningRevision);
  const { changed } = usePermission();
  // Each message: { id, role: 'user' | 'mentor', text, lang, streaming?, source?, flagged? }
  const [messages, setMessages] = useState([]);
  const [busy, setBusy] = useState(false); // true while waiting for or reading a reply
  const [notice, setNotice] = useState(''); // a short explanation shown above the input
  const [suggestions, setSuggestions] = useState(null); // null = use the default list
  const [status, setStatus] = useState('checking'); // 'checking' | 'live' | 'offline' | 'unreachable'
  const abortRef = useRef(null);
  const roundRef = useRef(0); // goes up on every clear
  const busyRef = useRef(false); // same as `busy`, but readable straight away

  // Ask the server once whether the AI is available; cancel any reply if the chat goes away.
  useEffect(() => {
    mentorStatus().then(setStatus);
    return () => { roundRef.current++; abortRef.current?.abort(); };
  }, []);

  // New language, so go back to that language's starter suggestions.
  useEffect(() => setSuggestions(null), [language]);

  async function send(raw) {
    const text = raw.trim().slice(0, MAX_QUESTION_LENGTH);
    if (!text || busyRef.current) return false;
    const round = roundRef.current;
    const current = () => round === roundRef.current; // false once the chat was cleared
    busyRef.current = true;
    setNotice('');
    setBusy(true);

    // What the server sees: earlier messages that have text, plus this question. Long mentor
    // replies are shortened so the server's size limits always accept the history.
    const history = [...messages.filter((m) => m.text), { role: 'user', text }]
      .slice(-HISTORY)
      .map(({ role, text: body }) => ({ role, text: role === 'mentor' ? body.slice(0, MAX_REPLY_IN_HISTORY) : body }));
    // Checked here too, so the trusted-adult card shows even if the server can't be reached.
    const sensitive = history.some((m) => m.role === 'user' && isSensitive(m.text));

    // Show the question straight away, and an empty reply that fills in as words arrive.
    const replyId = nextId++;
    const update = (change) => {
      if (!current()) return;
      setMessages((list) => list.map((m) => (m.id === replyId ? { ...m, ...change(m) } : m)));
    };
    setMessages((list) => [
      ...list,
      { id: nextId++, role: 'user', text, lang: language },
      { id: replyId, role: 'mentor', text: '', lang: language, streaming: true, flagged: sensitive },
    ]);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      await askMentor({
        revision,
        language,
        messages: history,
        context,
        signal: controller.signal,
        onStart: ({ source, flagged }) => update(() => ({ source, flagged: flagged || sensitive })),
        onDelta: (piece) => update((m) => ({ text: m.text + piece })),
        onDone: ({ suggestions: next }) => current() && setSuggestions(next),
      });
      update(() => ({ streaming: false }));
    } catch (error) {
      if (error.name === 'AbortError' || !current()) return true; // the chat was cleared on purpose
      if (error instanceof MentorError && (error.status === 403 || error.status === 409)) {
        clear(); changed(); return true;
      }
      if (error instanceof MentorError && (error.status === 400 || error.status === 429)) {
        // A bad message or too many questions: remove the empty reply and explain.
        setMessages((list) => list.filter((m) => m.id !== replyId));
        setNotice(error.message);
      } else if (error instanceof MentorError && error.cutShort) {
        // The answer started but stopped: keep what arrived, mark it, and say so.
        update((m) => ({ text: m.text ? `${m.text} …` : offlineAnswer(text, language, sensitive), streaming: false, cutShort: true }));
        setNotice(mentorText[language].cutShort);
      } else {
        // Server unreachable or broken: answer from the prepared set so the demo carries on.
        setStatus('unreachable');
        update(() => ({ text: offlineAnswer(text, language, sensitive), source: 'prepared', streaming: false }));
        setNotice(mentorText[language].offline);
      }
    } finally {
      // Only the chat this question belongs to is unlocked; clear() already unlocked a new one.
      if (current()) {
        busyRef.current = false;
        setBusy(false);
      }
    }
    return true;
  }

  function clear() {
    roundRef.current += 1;
    abortRef.current?.abort();
    busyRef.current = false;
    setMessages([]);
    setSuggestions(null);
    setNotice('');
    setBusy(false);
  }

  // Sprout looks thoughtful until the first words of a reply arrive.
  const thinking = busy && messages[messages.length - 1]?.text === '';

  return { messages, busy, notice, suggestions, status, thinking, send, clear };
}
