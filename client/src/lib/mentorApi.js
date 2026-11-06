// Talks to the server's Paisa Mentor (see docs/mentor-api.md).
// The reply arrives as lines of JSON; we read them as they come so text appears word by word.

export class MentorError extends Error {
  constructor(message, { status = 0, retryAfter = 0, cutShort = false } = {}) {
    super(message);
    this.status = status; // 0 = couldn't reach the server at all
    this.retryAfter = retryAfter;
    this.cutShort = cutShort; // true = the answer started but didn't finish
  }
}

export async function askMentor({ language, messages, context, revision, signal, onStart, onDelta, onDone }) {
  let response;
  try {
    response = await fetch('/api/mentor/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-learning-revision': String(revision ?? 0) },
      body: JSON.stringify({ language, messages, context }),
      signal,
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new MentorError('Can’t reach the mentor right now.');
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new MentorError(body.message || 'The mentor is unavailable.', {
      status: response.status,
      retryAfter: Number(response.headers.get('retry-after')) || 0,
    });
  }

  // Read the stream piece by piece and split it into lines; each line is one event.
  // A finished answer always ends with a "done" event. If the stream stops without one (a dropped
  // connection), the answer is incomplete, so we throw MentorError with `cutShort` set.
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';
  let finished = false;
  const handle = (line) => {
    if (!line.trim()) return;
    let event;
    try {
      event = JSON.parse(line);
    } catch {
      throw new MentorError('The mentor sent a broken answer.', { cutShort: true });
    }
    if (event.type === 'start') onStart?.(event);
    else if (event.type === 'delta' && typeof event.text === 'string') onDelta?.(event.text);
    else if (event.type === 'done') {
      finished = true;
      onDone?.(event);
    }
  };
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += value;
      let newline;
      while ((newline = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, newline);
        buffer = buffer.slice(newline + 1);
        handle(line);
      }
    }
    handle(buffer); // a last line without a newline still counts
  } catch (error) {
    if (error.name === 'AbortError' || error instanceof MentorError) throw error;
    throw new MentorError('The connection to the mentor dropped.', { cutShort: true });
  } finally {
    reader.releaseLock();
  }
  if (!finished) throw new MentorError('The answer was cut short.', { cutShort: true });
}

// 'live' (AI key set), 'offline' (server up, no key) or 'unreachable' (no server).
export async function mentorStatus() {
  try {
    const response = await fetch('/api/health');
    const body = await response.json();
    return body.mentor?.aiConfigured ? 'live' : 'offline';
  } catch {
    return 'unreachable';
  }
}
