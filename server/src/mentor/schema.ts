// The exact shape of a chat request (see docs/mentor-api.md). Anything else is rejected with 400.
import { z } from 'zod';

const rupees = (max: number) => z.number().int().min(0).max(max);

export const chatRequestSchema = z
  .object({
    language: z.enum(['en', 'hi']),
    messages: z
      .array(
        z
          .object({
            role: z.enum(['user', 'mentor']),
            text: z.string().trim().min(1).max(600),
          })
          .strict(),
      )
      .min(1)
      .max(12)
      .refine((list) => list[list.length - 1].role === 'user', 'The last message must be from the user'),
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
            label: z.string().trim().min(1).max(40),
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
