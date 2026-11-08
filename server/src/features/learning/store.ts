// Saved sample activity reviews. Learning credits never move or convert PayPal money.
// Write the next state first, then publish it in memory: a failed save awards nothing.
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { z } from 'zod';
import { lessonIds, type LessonId } from '../seedlings/answers.js';
import { StateConflict, type AwaitableStore } from '../../shared/storage/database.js';

export const learnerCodes = ['A12', 'B07', 'C33'] as const;
export type LearnerCode = typeof learnerCodes[number];
export const consentPolicy = 'demo-permission-v2';
export type Consent = { learner: LearnerCode; status: 'pending' | 'active' | 'withdrawn' | 'deleted';
  revision: number; policy: string; acknowledgedAt: string | null; changedAt: string | null };
const consentSchema = z.object({
  learner: z.enum(learnerCodes), status: z.enum(['pending', 'active', 'withdrawn', 'deleted']),
  revision: z.number().int().positive(), policy: z.enum(['demo-permission-v1', consentPolicy]),
  acknowledgedAt: z.string().datetime().nullable(), changedAt: z.string().datetime(),
}).strict();

const activitySchema = z.object({
  id: z.string(), learner: z.string(), title: z.string(), credits: z.number().int().nonnegative(),
  status: z.enum(['pending', 'approved', 'returned']),
  reviewedAt: z.string().nullable(), reviewedBy: z.enum(['mentor', 'admin']).nullable(),
}).strict();
const stateSchema = z.object({
  version: z.literal(1), activities: z.array(activitySchema).max(1000),
  // The default upgrades existing NGO records without changing their saved decisions.
  seedlings: z.array(z.object({ lessonId: z.enum(lessonIds), completedAt: z.string() }).strict())
    .max(lessonIds.length).refine((rows) => new Set(rows.map((row) => row.lessonId)).size === rows.length)
    .default([]),
  consents: z.array(consentSchema).max(learnerCodes.length)
    .refine((rows) => new Set(rows.map((row) => row.learner)).size === rows.length).default([]),
}).strict();
type State = z.infer<typeof stateSchema>;
export type StaffRole = 'mentor' | 'admin';

export class LearningStoreError extends Error {
  constructor() { super('The learning progress could not be saved. Nothing was awarded. Please try again once storage is available.'); }
}

const samples = [
  { id: 'ACT-001', learner: 'A12', title: 'Reading hour at the learning centre', credits: 200 },
  { id: 'ACT-002', learner: 'B07', title: 'Sorted the library shelves', credits: 150 },
  { id: 'ACT-003', learner: 'C33', title: 'Taught counting change to a younger kid', credits: 200 },
];

export function createLearningStore(file: string | null = null, now = () => new Date(), demoOpenAccess = false) {
  let state: State = file && existsSync(file)
    ? stateSchema.parse(JSON.parse(readFileSync(file, 'utf8')))
    : { version: 1, activities: samples.map((a) => ({ ...a, status: 'pending', reviewedAt: null, reviewedBy: null })), seedlings: [], consents: [] };

  state.consents = state.consents.map(row => row.policy === consentPolicy ? row : {
    ...row, policy: consentPolicy, acknowledgedAt: null,
    ...(row.status === 'active' ? { status: 'pending' as const, revision: row.revision + 1, changedAt: now().toISOString() } : {}),
  });

  function persist(next: State) {
    if (!file) return;
    try {
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(`${file}.tmp`, `${JSON.stringify(next, null, 2)}\n`);
      renameSync(`${file}.tmp`, file);
    } catch { throw new LearningStoreError(); }
  }
  persist(state);
  let pendingPermission: State | null = null;
  function settlePermission() {
    if (!pendingPermission) return;
    persist(pendingPermission);
    state = pendingPermission;
    pendingPermission = null;
  }

  function snapshot() {
    settlePermission();
    const approved = state.activities.filter((a) => a.status === 'approved');
    const totalCredits = approved.reduce((sum, a) => sum + a.credits, 0);
    const learners = [...new Set(state.activities.map((a) => a.learner))].map((code) => {
      const credits = approved.filter((a) => a.learner === code).reduce((sum, a) => sum + a.credits, 0);
      // Keep whole credits in these jars; all fractional leftovers stay in Invest.
      // Rounding each share up could otherwise make Invest negative for a small reward.
      const save = Math.floor(credits * 0.5);
      const spend = Math.floor(credits * 0.3);
      const give = Math.floor(credits * 0.1);
      return { code, credits, jars: { save, spend, give, invest: credits - save - spend - give } };
    });
    return {
      activities: structuredClone(state.activities), learners,
      totals: {
        pending: state.activities.filter((a) => a.status === 'pending').length,
        approved: approved.length,
        returned: state.activities.filter((a) => a.status === 'returned').length,
        totalCredits,
      },
    };
  }

  function consent(learner: LearnerCode = 'A12'): Consent {
    settlePermission();
    const saved = state.consents.find((row) => row.learner === learner);
    return saved ? structuredClone(saved) : {
      learner, status: 'pending' as const, revision: 0, policy: consentPolicy,
      acknowledgedAt: null, changedAt: null,
    };
  }

  return {
    snapshot,
    consent,
    // A deleted marker contains only a fixed sample code and permission revision. It prevents
    // reloads, restarts and delayed requests from recreating the deleted learner's progress.
    changeConsent(learner: LearnerCode, action: 'acknowledge' | 'withdraw' | 'delete', expectedRevision?: number) {
      const current = consent(learner);
      if (expectedRevision !== undefined && current.revision !== expectedRevision)
        throw new StateConflict('consent_changed', 'Permission changed in another tab. Refresh before making this decision.');
      const status = action === 'acknowledge' ? 'active' : action === 'withdraw' ? 'withdrawn' : 'deleted';
      if (current.status === status || (current.status === 'deleted' && action === 'withdraw')) return current;
      const next = structuredClone(state);
      const timestamp = now().toISOString();
      const saved = { learner, status, revision: current.revision + 1, policy: consentPolicy,
        acknowledgedAt: action === 'acknowledge' ? timestamp : action === 'delete' ? null : current.acknowledgedAt,
        changedAt: timestamp } as z.infer<typeof consentSchema>;
      next.consents = next.consents.filter((row) => row.learner !== learner);
      next.consents.push(saved);
      if (action === 'delete') {
        next.activities = next.activities.filter((row) => row.learner !== learner);
        if (learner === 'A12') next.seedlings = [];
      }
      // Keep an uncertain permission change blocked until it can be saved. No other learning
      // write may overwrite a pending withdrawal/deletion while storage is unavailable.
      pendingPermission = next;
      settlePermission();
      return consent(learner);
    },
    garden() {
      settlePermission();
      return { completed: structuredClone(state.seedlings), seeds: state.seedlings.length, totalLessons: lessonIds.length };
    },
    completeLesson(lessonId: LessonId, expectedRevision?: number) {
      settlePermission();
      if (expectedRevision !== undefined && consent().revision !== expectedRevision)
        throw new StateConflict('consent_changed', 'Permission changed. Check guardian permission again before continuing.');
      if (state.seedlings.some((row) => row.lessonId === lessonId)) return 'unchanged' as const;
      const next = structuredClone(state);
      next.seedlings.push({ lessonId, completedAt: now().toISOString() });
      persist(next);
      state = next;
      return 'saved' as const;
    },
    review(id: string, decision: 'approved' | 'returned', role: StaffRole) {
      settlePermission();
      const activity = state.activities.find((a) => a.id === id);
      if (!activity) return 'not_found' as const;
      if (!demoOpenAccess && consent(activity.learner as LearnerCode).status !== 'active') return 'consent_required' as const;
      if (activity.status !== 'pending') return activity.status === decision ? 'unchanged' as const : 'conflict' as const;
      const next = structuredClone(state);
      const changed = next.activities.find((a) => a.id === id)!;
      changed.status = decision;
      changed.reviewedAt = now().toISOString();
      changed.reviewedBy = role;
      persist(next);
      state = next;
      return 'saved' as const;
    },
  };
}
export type LearningStore = AwaitableStore<ReturnType<typeof createLearningStore>>;
