// Working picture lessons for one shared sample garden. Only server-confirmed completions grow it.
import { useLanguage } from '../language/language.jsx';
import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Apple,
  ArrowLeft,
  Bike,
  BookOpen,
  Bus,
  Candy,
  Check,
  Clock,
  Gamepad2,
  HeartHandshake,
  RefreshCw,
  Shirt,
  Sprout,
  Users,
  Volume2,
  VolumeX,
} from 'lucide-react';
import Mascot from '../../shared/components/Mascot.jsx';
import { Reveal } from '../../shared/motion.jsx';
import { useSeedlings } from './useSeedlings.js';
import { seedlings } from '../../content/seedlings.js';

const pictures = {
  food: Apple,
  book: BookOpen,
  bus: Bus,
  candy: Candy,
  shirt: Shirt,
  game: Gamepad2,
  bike: Bike,
  clock: Clock,
  adult: Users,
  books: HeartHandshake,
};

export default function Seedlings() {
  const { t, language, setLanguage } = useLanguage();

  const [lessonId, setLessonId] = useState('needs');
  const [answers, setAnswers] = useState({});
  const [missing, setMissing] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [speechError, setSpeechError] = useState(false);
  const questionRefs = useRef([]);
  const feedbackRef = useRef(null);
  const utterance = useRef(null);
  const workspace = useSeedlings();
  const { garden, busy, error, incorrect, notice } = workspace;
  const text = seedlings[language];
  const lesson = text.lessonList.find((item) => item.id === lessonId);
  const selected = answers[lessonId] ?? {};
  const completed = garden?.completed.some((item) => item.lessonId === lessonId);
  const canSpeak =
    typeof window.speechSynthesis?.speak === 'function' &&
    typeof window.SpeechSynthesisUtterance === 'function';
  const stop = () => {
    utterance.current = null;
    if (canSpeak) window.speechSynthesis.cancel();
    setSpeaking(false);
  };
  useEffect(() => {
    setSpeechError(false);
    setSpeaking(false);
    return () => {
      utterance.current = null;
      if (canSpeak) window.speechSynthesis.cancel();
    };
  }, [language, lessonId, canSpeak]);
  useEffect(() => {
    if (incorrect.length) questionRefs.current[incorrect[0]]?.focus();
  }, [incorrect]);
  useEffect(() => {
    if (notice) feedbackRef.current?.focus();
  }, [notice]);

  const read = () => {
    if (speaking) {
      stop();
      return;
    }
    if (!canSpeak) return;
    stop();
    setSpeechError(false);
    const speech = new SpeechSynthesisUtterance(
      [
        lesson.title,
        lesson.intro,
        ...lesson.questions.map(
          (question) =>
            `${question.label}. ${question.prompt} ${question.choices.map(([, label]) => label).join('. ')}`,
        ),
      ].join('. '),
    );
    speech.lang = language === 'hi' ? 'hi-IN' : 'en-IN';
    speech.rate = 0.9;
    const voice = window.speechSynthesis.getVoices().find((item) => item.lang.startsWith(language));
    if (voice) speech.voice = voice;
    utterance.current = speech;
    speech.onend = () => {
      if (utterance.current === speech) {
        utterance.current = null;
        setSpeaking(false);
      }
    };
    speech.onerror = () => {
      if (utterance.current === speech) {
        utterance.current = null;
        setSpeaking(false);
        setSpeechError(true);
      }
    };
    try {
      setSpeaking(true);
      window.speechSynthesis.speak(speech);
    } catch {
      utterance.current = null;
      setSpeaking(false);
      setSpeechError(true);
    }
  };
  const chooseLesson = (id) => {
    stop();
    setLessonId(id);
    setMissing(false);
    workspace.resetFeedback();
  };
  const submit = (event) => {
    event.preventDefault();
    const first = lesson.questions.findIndex((_, index) => !selected[index]);
    setMissing(first >= 0);
    if (first >= 0) {
      questionRefs.current[first]?.focus();
      return;
    }
    stop();
    void workspace.complete(
      lessonId,
      lesson.questions.map((_, index) => selected[index]),
    );
  };

  return (
    <section
      id="preview"
      className="section seedlings-page"
      data-preview="seedlings"
      lang={language}
    >
      <div className="container">
        <Link to="/soon" className="link-btn quiet">
          <ArrowLeft size={18} aria-hidden="true" />
          {text.back}
        </Link>
        <Reveal className="seedlings-heading">
          <div className="stack">
            <span className="tag tag-green">{text.tag}</span>
            <h1>{text.title}</h1>
            <p className="lead">{text.intro}</p>
          </div>
          <Mascot size={120} mood={garden?.seeds ? 'cheer' : 'think'} />
        </Reveal>
        <div className="preview-banner real-banner" role="note">
          <Sprout size={24} aria-hidden="true" />
          <span>{text.note}</span>
        </div>
        <div className="seedlings-toolbar">
          <div className="row" role="group" aria-label={text.language}>
            <button
              className="chip"
              lang="en"
              aria-pressed={language === 'en'}
              onClick={() => setLanguage('en')}
            >
              {t('English')}
            </button>
            <button
              className="chip"
              lang="hi"
              aria-pressed={language === 'hi'}
              onClick={() => setLanguage('hi')}
            >
              हिन्दी
            </button>
          </div>
          <button
            className="btn btn-sm btn-white"
            onClick={workspace.refresh}
            disabled={Boolean(busy)}
          >
            <RefreshCw size={18} aria-hidden="true" />
            {text.refresh}
          </button>
        </div>
        {!garden ? (
          <div className="card stack seedlings-loading" aria-busy={Boolean(busy)}>
            <Mascot size={76} mood="think" />
            <p role={error ? 'alert' : 'status'}>{t(error ? text[error] : text.loading)}</p>
            {error && (
              <button
                className="btn btn-green"
                onClick={workspace.refresh}
                disabled={Boolean(busy)}
              >
                {text.retry}
              </button>
            )}
          </div>
        ) : (
          <div className="seedlings-layout">
            <aside className="card seedlings-garden" aria-labelledby="garden-title">
              <span className="tag tag-white">{text.garden}</span>
              <h2 id="garden-title" data-testid="seed-count">
                {text.seedCount(garden.seeds)}
              </h2>
              <div className="seedlings-plots" role="img" aria-label={text.seedCount(garden.seeds)}>
                {[1, 2, 3].map((number) => (
                  <span
                    key={number}
                    className={`seedlings-plot${number <= garden.seeds ? ' planted' : ''}`}
                    aria-hidden="true"
                  >
                    <Sprout size={number <= garden.seeds ? 48 : 26} strokeWidth={2.25} />
                  </span>
                ))}
              </div>
              <strong>
                {t(garden.seeds === 3 ? text.allDone : garden.seeds ? text.growing : text.empty)}
              </strong>
              <p>{text.gardenHint}</p>
              <nav className="seedlings-lessons" aria-label={text.lessons}>
                {text.lessonList.map((item, index) => (
                  <button
                    key={item.id}
                    className={`seedlings-lesson${lessonId === item.id ? ' selected' : ''}`}
                    aria-current={lessonId === item.id ? 'step' : undefined}
                    onClick={() => chooseLesson(item.id)}
                    disabled={Boolean(busy)}
                  >
                    <span className="seedlings-lesson-number">
                      {t(
                        garden.completed.some((row) => row.lessonId === item.id) ? (
                          <Check size={22} aria-hidden="true" />
                        ) : (
                          index + 1
                        ),
                      )}
                    </span>
                    <span>
                      <strong>{t(item.title)}</strong>
                      <small>
                        {t(
                          garden.completed.some((row) => row.lessonId === item.id)
                            ? text.complete
                            : text.ready,
                        )}
                      </small>
                    </span>
                  </button>
                ))}
              </nav>
            </aside>
            <form
              className="card stack seedlings-lesson-panel"
              noValidate
              onSubmit={submit}
              aria-busy={Boolean(busy)}
            >
              <div className="seedlings-lesson-head">
                <span className="tag tag-yellow">
                  {text.lessonCount(text.lessonList.findIndex((item) => item.id === lessonId) + 1)}
                </span>
                {canSpeak && (
                  <button type="button" className="btn btn-sm btn-white" onClick={read}>
                    {speaking ? (
                      <VolumeX size={18} aria-hidden="true" />
                    ) : (
                      <Volume2 size={18} aria-hidden="true" />
                    )}
                    {t(speaking ? text.stop : text.read)}
                  </button>
                )}
              </div>
              <h2>{t(lesson.title)}</h2>
              <p>{t(lesson.intro)}</p>
              {!canSpeak && <p className="hint">{text.speechUnavailable}</p>}
              {speechError && (
                <p role="status" className="hint">
                  {text.speechFailed}
                </p>
              )}
              <div
                className={`seedlings-questions${lessonId === 'needs' ? ' seedlings-sort' : ''}`}
              >
                {lesson.questions.map((question, index) => {
                  const Icon = pictures[question.icon];
                  const invalid = incorrect.includes(index) || (missing && !selected[index]);
                  const questionKey = `${lessonId}-${index}`;
                  return (
                    <fieldset
                      key={questionKey}
                      className={`seedlings-question${invalid ? ' needs-answer' : ''}`}
                      tabIndex={-1}
                      ref={(node) => {
                        questionRefs.current[index] = node;
                      }}
                      aria-invalid={invalid || undefined}
                      aria-describedby={invalid ? `${questionKey}-error` : undefined}
                      disabled={Boolean(busy)}
                    >
                      <legend>{t(question.label)}</legend>
                      <Icon size={44} strokeWidth={2.25} aria-hidden="true" />
                      <p>{t(question.prompt)}</p>
                      <div className="seedlings-choices">
                        {question.choices.map(([id, label]) => (
                          <label
                            key={id}
                            className={`seedlings-choice${selected[index] === id ? ' selected' : ''}`}
                          >
                            <input
                              type="radio"
                              name={questionKey}
                              value={id}
                              checked={selected[index] === id}
                              onChange={() => {
                                setAnswers((before) => ({
                                  ...before,
                                  [lessonId]: { ...before[lessonId], [index]: id },
                                }));
                                setMissing(false);
                                workspace.resetFeedback();
                              }}
                            />
                            {t(label)}
                          </label>
                        ))}
                      </div>
                      {invalid && (
                        <p className="hint" id={`${questionKey}-error`}>
                          {text.wrong}
                        </p>
                      )}
                    </fieldset>
                  );
                })}
              </div>
              <div
                className="seedlings-feedback"
                aria-live="polite"
                ref={feedbackRef}
                tabIndex={-1}
              >
                {missing || error ? (
                  <p className="chat-notice" role="alert">
                    {t(text[missing ? 'missing' : error])}
                  </p>
                ) : notice ? (
                  <p className="seedlings-saved" role="status">
                    <Check size={20} aria-hidden="true" />
                    {t(text[notice])}
                  </p>
                ) : null}
              </div>
              <button className="btn btn-green seedlings-submit" disabled={Boolean(busy)}>
                <Sprout size={20} aria-hidden="true" />
                {t(busy === 'save' ? text.saving : completed ? text.practise : text.save)}
              </button>
            </form>
          </div>
        )}
      </div>
    </section>
  );
}
