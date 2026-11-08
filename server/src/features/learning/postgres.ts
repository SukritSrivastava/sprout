import { StateConflict, type Database, type Query } from '../../shared/storage/database.js';
import { consentPolicy, type LearnerCode, type LearningStore } from './store.js';
import { lessonIds } from '../seedlings/answers.js';

type LearnerRow = { code: LearnerCode; status: 'pending' | 'active' | 'withdrawn' | 'deleted'; revision: number;
  acknowledged_at: Date | null; changed_at: Date | null; consent_policy: string };
type Activity = Awaited<ReturnType<LearningStore['snapshot']>>['activities'][number];
type ActivityRow = Omit<Activity, 'reviewedAt' | 'reviewedBy'> & { reviewed_at: Date | null; reviewed_by: Activity['reviewedBy'] };
const consent = (r: LearnerRow) => ({ learner: r.code, status: r.status, revision: r.revision, policy: consentPolicy,
  acknowledgedAt: r.consent_policy === consentPolicy ? r.acknowledged_at?.toISOString() ?? null : null,
  changedAt: r.changed_at?.toISOString() ?? null });

export function createPostgresLearning(db: Database, demoOpenAccess: boolean): LearningStore {
  const learner = async (query: Query, code: LearnerCode, forUpdate = false) => {
    const { rows: [r] } = await query<LearnerRow>(`SELECT * FROM sprout_learners WHERE code=$1${forUpdate ? ' FOR UPDATE' : ''}`, [code]);
    if (!r) throw new Error('Sample learner marker is missing.');
    // An old API may still finish a write during deployment. Its policy cannot authorize
    // learning under the new statement, even if it sets the row back to active.
    return r.status === 'active' && r.consent_policy !== consentPolicy
      ? { ...r, status: 'pending' as const, acknowledged_at: null } : r;
  };
  return {
    async snapshot() {
      const { rows } = await db.query<ActivityRow>('SELECT * FROM sprout_activities ORDER BY id');
      const activities = rows.map(({ reviewed_at, reviewed_by, ...r }) => ({ ...r, reviewedAt: reviewed_at?.toISOString() ?? null, reviewedBy: reviewed_by }));
      const approved = activities.filter((a) => a.status === 'approved');
      const learners = [...new Set(activities.map((a) => a.learner))].map((code) => {
        const credits = approved.filter((a) => a.learner === code).reduce((sum,a) => sum+a.credits,0);
        const save = Math.floor(credits*0.5), spend = Math.floor(credits*0.3), give = Math.floor(credits*0.1);
        return { code, credits, jars: { save, spend, give, invest: credits-save-spend-give } };
      });
      return { activities, learners, totals: { pending: activities.filter((a) => a.status === 'pending').length,
        approved: approved.length, returned: activities.filter((a) => a.status === 'returned').length,
        totalCredits: approved.reduce((sum,a) => sum+a.credits,0) } };
    },
    async consent(code = 'A12') { return consent(await learner(db.query,code)); },
    async changeConsent(code, action, expectedRevision) {
      return db.transaction(async (query) => {
        const current = await learner(query,code,true);
        if (expectedRevision !== undefined && current.revision !== expectedRevision)
          throw new StateConflict('consent_changed','Permission changed in another tab. Refresh before making this decision.');
        const status = action === 'acknowledge' ? 'active' : action === 'withdraw' ? 'withdrawn' : 'deleted';
        if (status === current.status || (current.status === 'deleted' && action === 'withdraw')) return consent(current);
        if (action === 'delete') {
          await query('DELETE FROM sprout_activities WHERE learner=$1',[code]);
          await query('DELETE FROM sprout_completions WHERE learner=$1',[code]);
        }
        const { rows: [r] } = await query<LearnerRow>(`UPDATE sprout_learners SET status=$2,revision=revision+1,changed_at=now(),consent_policy=$3,
          acknowledged_at=CASE WHEN $2='active' THEN now() WHEN $2='deleted' THEN NULL
            WHEN consent_policy=$3 THEN acknowledged_at ELSE NULL END
          WHERE code=$1 RETURNING *`, [code,status,consentPolicy]);
        return consent(r);
      });
    },
    async garden() {
      const { rows } = await db.query<{ lesson_id: typeof lessonIds[number]; completed_at: Date }>("SELECT * FROM sprout_completions WHERE learner='A12' ORDER BY completed_at,lesson_id");
      return { completed: rows.map((r) => ({ lessonId: r.lesson_id, completedAt: r.completed_at.toISOString() })), seeds: rows.length, totalLessons: lessonIds.length };
    },
    async completeLesson(lessonId, expectedRevision) {
      return db.transaction(async (query) => {
        const current = await learner(query,'A12',true);
        if (!demoOpenAccess && current.status !== 'active') throw new StateConflict('consent_required','A guardian must record demo permission before learning or AI chat.',403);
        if (current.revision !== expectedRevision) throw new StateConflict('consent_changed','Permission changed. Check guardian permission again before continuing.');
        const { rows } = await query("INSERT INTO sprout_completions(learner,lesson_id) VALUES ('A12',$1) ON CONFLICT DO NOTHING RETURNING lesson_id",[lessonId]);
        return rows.length ? 'saved' as const : 'unchanged' as const;
      });
    },
    async review(id, decision, role) {
      return db.transaction(async (query) => {
        const { rows: [activity] } = await query<ActivityRow>('SELECT * FROM sprout_activities WHERE id=$1',[id]);
        if (!activity) return 'not_found' as const;
        const current = await learner(query,activity.learner as LearnerCode,true);
        // Re-read after the learner lock; deletion and another review may have won the race.
        const { rows: [latest] } = await query<ActivityRow>('SELECT * FROM sprout_activities WHERE id=$1',[id]);
        if (!latest) return 'not_found' as const;
        if (!demoOpenAccess && current.status !== 'active') return 'consent_required' as const;
        if (latest.status !== 'pending') return latest.status === decision ? 'unchanged' as const : 'conflict' as const;
        await query('UPDATE sprout_activities SET status=$2,reviewed_at=now(),reviewed_by=$3 WHERE id=$1',[id,decision,role]);
        return 'saved' as const;
      });
    },
  };
}
