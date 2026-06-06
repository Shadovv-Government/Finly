import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { getHealthScoreData, getProblemDetectorIssues, type DetectedIssue } from '../../../db/premium';
import { calculateHealthScore, type HealthScoreResult } from '../../../lib/healthScore';
import { HealthScoreGauge } from './HealthScoreGauge';
import { EmptyState } from '../../components/EmptyState';

export const HealthTab = () => {
  const [health, setHealth] = useState<HealthScoreResult | null>(null);
  const [issues, setIssues] = useState<DetectedIssue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [healthData, detectedIssues] = await Promise.all([
        getHealthScoreData(),
        getProblemDetectorIssues(),
      ]);
      if (cancelled) return;
      setHealth(calculateHealthScore(healthData));
      setIssues(detectedIssues);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="bg-muted rounded-2xl h-48 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Health Score */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="card-premium p-5">
          <h3 className="font-semibold mb-4 text-center">Финансовое здоровье</h3>
          {health ? (
            <HealthScoreGauge score={health.score} metrics={health.metrics} />
          ) : (
            <EmptyState icon="Heart" title="Нет данных для расчёта" description="Добавьте категории и транзакции для анализа" />
          )}
        </div>
      </motion.div>

      {/* Recommendations */}
      {health && health.recommendations.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="card-premium p-5">
            <h3 className="font-semibold mb-3">План улучшения</h3>
            <div className="space-y-2">
              {health.recommendations.map((rec, i) => (
                <div key={i} className="flex items-start gap-2 p-3 bg-muted rounded-xl">
                  <span className="text-amber-500 font-bold flex-shrink-0">{i + 1}.</span>
                  <span className="text-sm">{rec}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Problem Detector */}
      {issues.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="card-premium p-5">
            <h3 className="font-semibold mb-3">Детектор проблем</h3>
            <div className="space-y-2">
              {issues.map((issue, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-xl border ${
                    issue.severity === 'danger'
                      ? 'border-red-500/20 bg-red-50 dark:bg-red-950/20'
                      : 'border-amber-500/20 bg-amber-50 dark:bg-amber-950/20'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span>{issue.severity === 'danger' ? '⚠️' : '⚡'}</span>
                    <span className="font-medium text-sm">{issue.title}</span>
                  </div>
                  <p className="text-xs text-muted-foreground ml-6">{issue.description}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};
