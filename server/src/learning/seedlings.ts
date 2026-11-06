// The server checks each picture lesson before awarding its one learning seed.
// These are fixed sample activities; seeds have no cash value and never touch PayPal.
export const lessonIds = ['needs', 'waiting', 'sharing'] as const;
export type LessonId = typeof lessonIds[number];
export const lessonAnswers: Record<LessonId, readonly string[]> = {
  needs: ['need', 'need', 'need', 'need', 'want', 'want'],
  waiting: ['save', 'wait'],
  sharing: ['ask', 'share'],
};
