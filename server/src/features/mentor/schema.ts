// The exact shape of a chat request (see docs/mentor-api.md). Anything else is rejected with 400.
import { z } from 'zod';
import { mentorSettings } from './settings.js';

const rupees = (max: number) => z.number().int().min(0).max(max);

// Must match `savingsGoals` in client/src/features/practice/model.js.
export const GOAL_LABELS = ['Headphones', 'Bicycle', 'Laptop'] as const;

export const chatRequestSchema = z
  .object({
    language: z.enum(['en', 'hi']),
    messages: z
      .array(
        // Kids' questions and earlier mentor replies have different length limits.
        z.discriminatedUnion('role', [
          z.object({ role: z.literal('user'), text: z.string().trim().min(1).max(mentorSettings.maxQuestionLength) }).strict(),
          z.object({ role: z.literal('mentor'), text: z.string().trim().min(1).max(mentorSettings.maxReplyLength) }).strict(),
        ]),
      )
      .min(1)
      .max(mentorSettings.maxMessages)
      // `at(-1)?.` so an empty list fails politely here instead of crashing (it used to cause a 500).
      .refine((list) => list.at(-1)?.role === 'user', 'The last message must be from the user'),
    context: z
      .object({
        jars: z
          .object({
            save: rupees(100_000),
            spend: rupees(100_000),
            give: rupees(100_000),
            invest: rupees(100_000),
          })
          .strict(),
        goal: z
          .object({
            // Only the demo's real goals. Free text here would go into the AI's instructions,
            // where "IGNORE RULES…" could steer it (found by a misuse test).
            label: z.enum(GOAL_LABELS),
            cost: rupees(1_000_000).min(1),
            monthly: rupees(100_000),
          })
          .strict(),
      })
      .strict()
      .optional(),
  })
  .strict();

export type ChatRequest = z.infer<typeof chatRequestSchema>;
export type Language = ChatRequest['language'];
