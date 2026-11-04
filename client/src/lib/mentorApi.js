// Talks to the server's Paisa Mentor (see docs/mentor-api.md).
// The reply arrives as lines of JSON; we read them as they come so text appears word by word.

export class MentorError extends Error {
  constructor(message, { status = 0, retryAfter = 0 } = {}) {
    super(message);
    this.status = status; // 0 = couldn't reach the server at all
    this.retryAfter = retryAfter;
  }
}

export async function askMentor({ language, messages, context, signal, onStart, onDelta, onDone }) {
  let response;
  try {
    response = await fetch('/api/mentor/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
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
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    let newline;
    while ((newline = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (!line) continue;
      const event = JSON.parse(line);
      if (event.type === 'start') onStart?.(event);
      else if (event.type === 'delta') onDelta?.(event.text);
      else if (event.type === 'done') onDone?.(event);
    }
  }
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
