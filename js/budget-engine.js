/**
 * budget-engine.js — Pure calculation engine for category budgets.
 * No DOM access. All functions are stateless and testable.
 * Called by budget.js (UI) and dashboard.js (widget).
 */

// ─── Cycle helpers ────────────────────────────────────────────────────────────

/**
 * Returns { start, end, totalDays, daysPassed, daysRemaining } for a cycle
 * defined by its ISO start and end date strings.
 */
export function getCycleMeta(cycleStart, cycleEnd) {
  const start = new Date(cycleStart);
  const end   = new Date(cycleEnd);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const totalDays   = Math.round((end - start) / 86400000) + 1;
  const daysPassed  = Math.max(1, Math.min(totalDays, Math.round((today - start) / 86400000) + 1));
  const daysRemaining = Math.max(0, totalDays - daysPassed);

  return { start: cycleStart, end: cycleEnd, totalDays, daysPassed, daysRemaining };
}

// ─── Per-category stats ───────────────────────────────────────────────────────

/**
 * Compute all budget statistics for one category.
 *
 * @param {object} budget   — { categoryName, amount, enabled }
 * @param {number} spent    — total spent this cycle in this category
 * @param {object} meta     — getCycleMeta() result
 * @returns {object}        — full stats record
 */
export function computeCategoryStats(budget, spent, meta) {
  const { amount: budgetAmount, categoryName, enabled } = budget;
  const { daysPassed, daysRemaining, totalDays } = meta;

  const remaining      = budgetAmount - spent;
  const pctUsed        = budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0;
  const pctRemaining   = Math.max(0, 100 - pctUsed);
  const avgDaily       = daysPassed > 0 ? spent / daysPassed : 0;
  const safeDaily      = daysRemaining > 0 ? Math.max(0, remaining) / daysRemaining : 0;
  const isOver         = remaining < 0;
  const projectedSpend = avgDaily * totalDays;
  const willExceed     = projectedSpend > budgetAmount;

  // Traffic-light status
  let status;
  if (!enabled)        status = 'disabled';
  else if (pctUsed >= 100) status = 'over';
  else if (pctUsed >= 85)  status = 'danger';
  else if (pctUsed >= 60)  status = 'warning';
  else                     status = 'ok';

  return {
    categoryName,
    budgetAmount,
    spent,
    remaining,
    pctUsed: Math.min(pctUsed, 100),          // cap bar at 100%
    pctUsedRaw: pctUsed,                       // may exceed 100 for over-budget
    pctRemaining,
    avgDaily,
    safeDaily,
    isOver,
    overBy: isOver ? Math.abs(remaining) : 0,
    projectedSpend,
    willExceed,
    status,
    enabled,
  };
}

// ─── Aggregate summary ────────────────────────────────────────────────────────

/**
 * Compute the rolled-up budget summary across all categories.
 *
 * @param {object[]} statsList  — array of computeCategoryStats() results
 * @param {object}   meta       — getCycleMeta() result
 * @returns {object}
 */
export function computeSummary(statsList, meta) {
  const enabled = statsList.filter((s) => s.enabled);

  const totalBudget  = enabled.reduce((a, s) => a + s.budgetAmount, 0);
  const totalSpent   = enabled.reduce((a, s) => a + s.spent,        0);
  const totalRemaining = totalBudget - totalSpent;
  const pctUsed      = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  const safeDaily    = meta.daysRemaining > 0
    ? Math.max(0, totalRemaining) / meta.daysRemaining
    : 0;

  const alertCategories = enabled.filter((s) => s.pctUsedRaw >= 80);
  const overCategories  = enabled.filter((s) => s.isOver);

  let overallStatus;
  if (overCategories.length > 0)          overallStatus = 'over';
  else if (pctUsed >= 85)                 overallStatus = 'danger';
  else if (pctUsed >= 60)                 overallStatus = 'warning';
  else                                    overallStatus = 'ok';

  return {
    totalBudget,
    totalSpent,
    totalRemaining,
    pctUsed,
    safeDaily,
    daysRemaining: meta.daysRemaining,
    daysPassed:    meta.daysPassed,
    totalDays:     meta.totalDays,
    alertCategories,
    overCategories,
    overallStatus,
  };
}

// ─── Spending trend data ──────────────────────────────────────────────────────

/**
 * Build day-by-day cumulative actual vs ideal spending arrays
 * for the current cycle.
 *
 * @param {object[]} transactions — filtered to current cycle expenses
 * @param {number}   totalBudget  — combined budget for all enabled categories
 * @param {object}   meta
 * @returns {{ labels, actual, ideal }}
 */
export function buildTrendData(transactions, totalBudget, meta) {
  const start = new Date(meta.start);
  const labels = [];
  const actual = [];
  const ideal  = [];

  const dailyIdeal = meta.totalDays > 0 ? totalBudget / meta.totalDays : 0;
  let cumActual = 0;

  for (let d = 0; d < meta.daysPassed; d++) {
    const date = new Date(start);
    date.setDate(start.getDate() + d);
    const dateStr = date.toISOString().split('T')[0];

    const daySpend = transactions
      .filter((t) => t.date === dateStr && t.type === 'expense')
      .reduce((s, t) => s + t.amount, 0);

    cumActual += daySpend;

    labels.push(date.toLocaleDateString('en-MY', { day: 'numeric', month: 'short' }));
    actual.push(parseFloat(cumActual.toFixed(2)));
    ideal.push(parseFloat(((d + 1) * dailyIdeal).toFixed(2)));
  }

  return { labels, actual, ideal };
}

// ─── Notification generation ──────────────────────────────────────────────────

/**
 * Returns an array of alert objects for categories that need attention.
 * Thresholds: 80%, 90%, 100%, >100%.
 *
 * @param {object[]} statsList
 * @returns {{ level, message, categoryName }[]}
 */
export function generateAlerts(statsList) {
  const alerts = [];

  for (const s of statsList) {
    if (!s.enabled) continue;

    if (s.isOver) {
      alerts.push({
        level: 'over',
        categoryName: s.categoryName,
        message: `${s.categoryName} budget exceeded by`,
        overBy: s.overBy,
      });
    } else if (s.pctUsedRaw >= 90) {
      alerts.push({
        level: 'danger',
        categoryName: s.categoryName,
        message: `${s.categoryName} budget is ${s.pctUsedRaw.toFixed(0)}% used — almost exhausted.`,
      });
    } else if (s.pctUsedRaw >= 80) {
      alerts.push({
        level: 'warning',
        categoryName: s.categoryName,
        message: `${s.categoryName} budget is ${s.pctUsedRaw.toFixed(0)}% used.`,
      });
    }
  }

  return alerts;
}
