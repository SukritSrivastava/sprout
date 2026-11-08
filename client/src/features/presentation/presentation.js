// Small maths shared by the demo cursor and Sprout's eyes. No browser or payment actions here.
export const samplePresentationActions = ['sample-earn', 'sample-save', 'sample-goal', 'sample-monthly'];

export function presentationCue(cues, seconds) {
  let index = 0;
  for (let i = 0; i < cues.length; i++) if (seconds >= cues[i].at) index = i;
  return { ...cues[index], index };
}

export function gazeToward(point, bounds) {
  const dx = point.x - (bounds.left + bounds.width * 0.5);
  const dy = point.y - (bounds.top + bounds.height * (64 / 110));
  const distance = Math.max(120, Math.hypot(dx, dy));
  return { x: (dx / distance) * 4, y: (dy / distance) * 3 };
}

// Leave the actual arrow inside the viewport. Its tip is 16px across and 12px down.
export function clampCursor(point, viewport) {
  return { x: Math.max(18, Math.min(viewport.width - 60, point.x)),
    y: Math.max(16, Math.min(viewport.height - 76, point.y)) };
}
