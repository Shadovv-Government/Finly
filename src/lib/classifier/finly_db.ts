/**
 * Finly Classifier DB v4 (Dexie / IndexedDB)
 *
 * New in v4 vs v3:
 *   - feedback table: stores (text_vec, numeric_vec, label) for incremental fine-tuning
 *   - telemetry gains uncertainty field
 *   - pruneFeedback() helper
 */

import Dexie, { type Table } from 'dexie';
import type { UserOverride, FeedbackEntry, TelemetryEvent, ClassifierDB } from './finly_runtime';

export class FinlyClassifierDB extends Dexie implements ClassifierDB {
  user_overrides!: Table<UserOverride, string>;
  feedback!:       Table<FeedbackEntry, number>;
  telemetry!:      Table<TelemetryEvent, number>;

  constructor(dbName = 'finly_classifier') {
    super(dbName);

    // v1 (finly_runtime v3): user_overrides + telemetry
    this.version(1).stores({
      user_overrides: 'description_normalized, updated_at, match_count',
      telemetry: '++id, timestamp, description, source, model_version',
    });

    // v2 (finly_runtime v4): adds feedback table; telemetry is unchanged
    this.version(2).stores({
      user_overrides: 'description_normalized, updated_at, match_count',
      feedback: '++id, timestamp, used_in_training, correct_label',
      telemetry: '++id, timestamp, description, source, model_version',
    });
  }

  /** Remove old telemetry to keep IndexedDB size bounded. */
  async pruneTelemetry(olderThanDays = 30): Promise<number> {
    const cutoff = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
    return this.telemetry.where('timestamp').below(cutoff).delete();
  }

  /**
   * Remove feedback that has already been incorporated into fine-tuning
   * and is older than N days. Keep recent entries for potential re-training.
   */
  async pruneFeedback(olderThanDays = 14): Promise<number> {
    const cutoff = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
    return this.feedback
      .filter(e => !!e.used_in_training && e.timestamp < cutoff)
      .delete();
  }

  /** Export feedback for optional server upload (with user consent). */
  async exportFeedback(): Promise<Array<{ description: string; category_idx: number; timestamp: number }>> {
    const entries = await this.feedback.toArray();
    return entries.map(e => ({
      description: e.description,
      category_idx: e.correct_label,
      timestamp: e.timestamp,
    }));
    // NOTE: text_vec is intentionally excluded from export — it's derived from
    // the description and adds no information, while being large (~8KB per entry).
  }
}

export function createClassifierDB(name?: string): FinlyClassifierDB {
  return new FinlyClassifierDB(name);
}
