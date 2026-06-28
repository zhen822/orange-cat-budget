/**
 * budget.js — Budget Planning feature
 * Handles: budget CRUD, budget overview page, dashboard widget, alerts, budget charts.
 * Zero modification to existing expense tracking logic.
 */

import {
  getAllCategoryBudgets,
  setCategoryBudget,
  updateCategoryBudget,
  deleteCategoryBudget,
  getAllCategories,
  getAllTransactions,
} from './storage.js';

import {
  formatCurrency,
  getCurrentCycle,
  AppState,
  showToast,
  openModal,
  closeModal,
  t,
  tc,
} from './app.js';

import {
  getCycleMeta,
  computeCategoryStats,
  computeSummary,
  buildTrendData,
  generateAlerts,
} from './budget-engine.js';

// ─── Module state ─────────────────────────────────────────────────────────────

let _budgets      = [];
let _categories   = [];
let _transactions = [];
let _statsList    = [];
let _summary      = {};
let _meta         = {};

const chartInstances = {};

// ─── Entry point: Budget page ─────────────────────────────────────────────────

export async function initBudgetPage() {
  await refreshData();
  renderBudgetSummaryCard();
  renderBudgetAlerts();
  renderCategoryBudgetList();
  renderBudgetCharts();
  setupBudgetFormListeners();
}

// ─── Entry point: Dashboard widget (called from dashboard.js) ─────────────────

export async function renderBudgetWidget() {
  await refreshData();
  renderDashboardSafeSpend();
  renderDashboardBudgetWidget();
}

// ─── Data refresh ─────────────────────────────────────────────────────────────

async function refreshData() {
  const cycle = getCurrentCycle();
  _meta  = getCycleMeta(cycle.start, cycle.end);

  [_budgets, _categories, _transactions] = await Promise.all([
    getAllCategoryBudgets(),
    getAllCategories(),
    getAllTransactions(),
  ]);

  const cycleExpenses = _transactions.filter(
    (t) => t.type === 'expense' && t.date >= cycle.start && t.date <= cycle.end
  );

  // Build per-category spent map
  const spentMap = {};
  cycleExpenses.forEach((t) => {
    spentMap[t.category] = (spentMap[t.category] || 0) + t.amount;
  });

  // Compute stats for every budget that has been set
  _statsList = _budgets.map((b) =>
    computeCategoryStats(b, spentMap[b.categoryName] || 0, _meta)
  );

  _summary = computeSummary(_statsList, _meta);
}

// ─── Budget summary card ──────────────────────────────────────────────────────

function renderBudgetSummaryCard() {
  const el = document.getElementById('budget-summary-card');
  if (!el) return;

  const { totalBudget, totalSpent, totalRemaining, pctUsed, safeDaily, daysRemaining, overallStatus } = _summary;

  const statusIcon  = { ok: '🟢', warning: '🟡', danger: '🟠', over: '🔴' }[overallStatus] || '🟢';
  const statusLabel = { ok: 'On Track', warning: 'Watch Spending', danger: t('dashboard.nearLimit'), over: t('dashboard.overBudget') }[overallStatus] || 'On Track';

  el.innerHTML = `
    <div class="bsum-grid">
      <div class="bsum-cell">
        <div class="bsum-label">Total Budget</div>
        <div class="bsum-value">${formatCurrency(totalBudget)}</div>
      </div>
      <div class="bsum-cell">
        <div class="bsum-label">Spent</div>
        <div class="bsum-value bsum-value--spent">${formatCurrency(totalSpent)}</div>
      </div>
      <div class="bsum-cell">
        <div class="bsum-label">Remaining</div>
        <div class="bsum-value bsum-value--remaining" style="color:${totalRemaining >= 0 ? 'var(--color-income)' : 'var(--color-expense)'}">${formatCurrency(Math.abs(totalRemaining))}</div>
      </div>
      <div class="bsum-cell">
        <div class="bsum-label">Used</div>
        <div class="bsum-value">${pctUsed.toFixed(0)}%</div>
      </div>
      <div class="bsum-cell">
        <div class="bsum-label">Days Left</div>
        <div class="bsum-value">${daysRemaining}d</div>
      </div>
      <div class="bsum-cell">
        <div class="bsum-label">Safe / Day</div>
        <div class="bsum-value bsum-value--safe">${formatCurrency(safeDaily)}</div>
      </div>
    </div>
    <div class="bsum-bar-wrap">
      <div class="bsum-bar">
        <div class="bsum-bar__fill bsum-bar__fill--${overallStatus}" style="width:${Math.min(100, pctUsed).toFixed(1)}%"></div>
      </div>
      <span class="bsum-status">${statusIcon} ${statusLabel}</span>
    </div>`;
}

// ─── Alerts ───────────────────────────────────────────────────────────────────

function renderBudgetAlerts() {
  const el = document.getElementById('budget-alerts');
  if (!el) return;

  const alerts = generateAlerts(_statsList);
  if (alerts.length === 0) {
    el.innerHTML = '';
    el.style.display = 'none';
    return;
  }

  el.style.display = 'flex';
  el.innerHTML = alerts.map((a) => {
    const icon  = { warning: '🟡', danger: '🟠', over: '🔴' }[a.level] || '🟡';
    const cls   = { warning: 'alert--warning', danger: 'alert--danger', over: 'alert--over' }[a.level] || '';
    const body  = a.level === 'over'
      ? `${a.message} <strong>${formatCurrency(a.overBy)}</strong>`
      : a.message;
    return `<div class="budget-alert ${cls}">${icon} ${body}</div>`;
  }).join('');
}

// ─── Category budget list ─────────────────────────────────────────────────────

function renderCategoryBudgetList() {
  const el = document.getElementById('budget-category-list');
  if (!el) return;

  if (_statsList.length === 0) {
    el.innerHTML = `
      <div class="empty-state">
        <span class="empty-state__icon">📋</span>
        <p>${t('budget.noBudgets')}</p>
      </div>`;
    return;
  }

  // Sort: over budget first, then by % used desc
  const sorted = [..._statsList].sort((a, b) => {
    if (a.isOver !== b.isOver) return a.isOver ? -1 : 1;
    return b.pctUsedRaw - a.pctUsedRaw;
  });

  el.innerHTML = sorted.map(categoryBudgetCard).join('');

  el.querySelectorAll('[data-toggle-budget]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = Number(btn.dataset.toggleBudget);
      const budget = _budgets.find((b) => b.id === id);
      if (!budget) return;
      await updateCategoryBudget(id, { enabled: !budget.enabled });
      await refresh();
    });
  });

  el.querySelectorAll('[data-edit-budget]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = Number(btn.dataset.editBudget);
      openEditModal(id);
    });
  });

  el.querySelectorAll('[data-delete-budget]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = Number(btn.dataset.deleteBudget);
      const b  = _budgets.find((x) => x.id === id);
      if (!confirm(`Delete budget for "${b?.categoryName}"?`)) return;
      await deleteCategoryBudget(id);
      await refresh();
      showToast(t('toast.budgetDeleted'));
    });
  });
}

function categoryBudgetCard(s) {
  const budget   = _budgets.find((b) => b.categoryName === s.categoryName);
  const barColor = { ok: 'var(--budget-ok)', warning: 'var(--budget-warning)', danger: 'var(--budget-danger)', over: 'var(--budget-over)' }[s.status] || 'var(--budget-ok)';
  const fillPct  = Math.min(100, s.pctUsed).toFixed(1);

  const safeSpendLine = s.isOver
    ? `<span class="bcat-over">Over by ${formatCurrency(s.overBy)}</span>`
    : `<span class="bcat-safe">Safe/day: <strong>${formatCurrency(s.safeDaily)}</strong></span>`;

  const toggleLabel = s.enabled ? t('budget.pause') : t('budget.resume');

  return `
    <div class="bcat-card bcat-card--${s.status}">
      <div class="bcat-header">
        <div class="bcat-title">
          <span class="bcat-icon">${catIcon(s.categoryName)}</span>
          <span class="bcat-name">${escHtml(s.categoryName)}</span>
          ${!s.enabled ? '<span class="tag">paused</span>' : ''}
        </div>
        <div class="bcat-actions">
          <button class="btn btn--ghost btn--sm" data-toggle-budget="${budget?.id}" title="${toggleLabel}">${toggleLabel}</button>
          <button class="icon-btn" data-edit-budget="${budget?.id}" title="Edit">✏️</button>
          <button class="icon-btn" data-delete-budget="${budget?.id}" title="Delete">🗑️</button>
        </div>
      </div>

      <div class="bcat-amounts">
        <div class="bcat-stat">
          <span class="bcat-stat__label">Budget</span>
          <span class="bcat-stat__value">${formatCurrency(s.budgetAmount)}</span>
        </div>
        <div class="bcat-stat">
          <span class="bcat-stat__label">Spent</span>
          <span class="bcat-stat__value" style="color:var(--color-expense)">${formatCurrency(s.spent)}</span>
        </div>
        <div class="bcat-stat">
          <span class="bcat-stat__label">Remaining</span>
          <span class="bcat-stat__value" style="color:${s.remaining >= 0 ? 'var(--color-income)' : 'var(--color-expense)'}">
            ${s.isOver ? '-' : ''}${formatCurrency(Math.abs(s.remaining))}
          </span>
        </div>
        <div class="bcat-stat">
          <span class="bcat-stat__label">Avg/day</span>
          <span class="bcat-stat__value">${formatCurrency(s.avgDaily)}</span>
        </div>
      </div>

      <div class="bcat-bar-wrap">
        <div class="bcat-bar">
          <div class="bcat-bar__fill" style="width:${fillPct}%;background:${barColor}"></div>
        </div>
        <div class="bcat-bar-meta">
          <span>${fillPct}% used</span>
          ${safeSpendLine}
        </div>
      </div>
    </div>`;
}

// ─── Budget form ──────────────────────────────────────────────────────────────

let _formListenersAttached = false;

function setupBudgetFormListeners() {
  const form = document.getElementById('budget-add-form');
  if (!form) return;

  // Always repopulate the category dropdown (needed on language change)
  populateCatSelect();

  // Wire event listeners only once — prevent duplicate handlers on re-init
  if (_formListenersAttached) return;
  _formListenersAttached = true;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const catSelect = document.getElementById('budget-cat-select');
    const amtInput  = document.getElementById('budget-amount-input');
    const catName   = catSelect?.value;
    const amount    = parseFloat(amtInput?.value);
    if (!catName || !amount || amount <= 0) {
      showToast(t('toast.budgetRequired'), 'error');
      return;
    }
    await setCategoryBudget(catName, amount);
    if (amtInput) amtInput.value = '';
    // Close the add sheet
    document.getElementById('budget-sheet')?.classList.remove('budget-sheet--open');
    document.body.style.overflow = '';
    await refresh();
    showToast(t('toast.budgetSet', { cat: tc(catName) }));
  });

  // Edit modal
  document.getElementById('budget-edit-save')?.addEventListener('click', async () => {
    const id      = Number(document.getElementById('budget-edit-id').value);
    const amount  = parseFloat(document.getElementById('budget-edit-amount').value);
    if (!id || !amount || amount <= 0) return;
    await updateCategoryBudget(id, { amount });
    closeModal('budget-edit-modal');
    await refresh();
    showToast(t('toast.budgetUpdated'));
  });

  document.getElementById('budget-edit-cancel')?.addEventListener('click', () => {
    closeModal('budget-edit-modal');
  });
}

function populateCatSelect() {
  const catSelect = document.getElementById('budget-cat-select');
  const catGrid   = document.getElementById('budget-cat-grid');
  if (!catSelect || _categories.length === 0) return;

  const expCats = _categories.filter((c) => c.type === 'expense');

  // Hidden select keeps the form value
  catSelect.innerHTML = expCats
    .map((c) => `<option value="${c.name}">${tc(c.name)}</option>`)
    .join('');

  // Visual pill grid — tap to select
  if (catGrid) {
    const current = catSelect.value;
    catGrid.innerHTML = expCats.map((c) => `
      <button type="button" class="bcat-pill ${c.name === current ? 'bcat-pill--selected' : ''}"
        data-cat="${escHtml(c.name)}">
        <span class="bcat-pill__icon">${catIcon(c.name)}</span>
        <span class="bcat-pill__name">${escHtml(tc(c.name))}</span>
      </button>`).join('');

    catGrid.querySelectorAll('.bcat-pill').forEach((btn) => {
      btn.addEventListener('click', () => {
        catGrid.querySelectorAll('.bcat-pill').forEach((b) => b.classList.remove('bcat-pill--selected'));
        btn.classList.add('bcat-pill--selected');
        catSelect.value = btn.dataset.cat;
      });
    });

    // Pre-select first if nothing selected
    if (!catSelect.value && expCats.length > 0) {
      catSelect.value = expCats[0].name;
      catGrid.querySelector('.bcat-pill')?.classList.add('bcat-pill--selected');
    }
  }
}


function openEditModal(id) {
  const budget = _budgets.find((b) => b.id === id);
  if (!budget) return;
  document.getElementById('budget-edit-id').value = id;
  document.getElementById('budget-edit-cat-label').textContent = budget.categoryName;
  document.getElementById('budget-edit-amount').value = budget.amount;
  openModal('budget-edit-modal');
}

// ─── Charts ───────────────────────────────────────────────────────────────────

function renderBudgetCharts() {
  renderBudgetVsActualChart();
  renderBudgetUsageDonut();
  renderSpendingTrendChart();
}

function destroyChart(key) {
  if (chartInstances[key]) {
    chartInstances[key].destroy();
    delete chartInstances[key];
  }
}

function renderBudgetVsActualChart() {
  destroyChart('bva');
  const canvas = document.getElementById('chart-budget-vs-actual');
  if (!canvas || _statsList.length === 0) return;

  const enabled = _statsList.filter((s) => s.enabled);
  const labels  = enabled.map((s) => s.categoryName);
  const budgets = enabled.map((s) => s.budgetAmount);
  const spents  = enabled.map((s) => s.spent);
  const rems    = enabled.map((s) => Math.max(0, s.remaining));

  chartInstances.bva = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: t('budget.budgetLabel'),    data: budgets, backgroundColor: 'rgba(91,106,240,0.18)', borderColor: '#5B6AF0', borderWidth: 1.5 },
        { label: t('budget.spent'),     data: spents,  backgroundColor: 'rgba(220,38,38,0.72)'  },
        { label: t('budget.remaining'), data: rems,    backgroundColor: 'rgba(22,163,74,0.65)'  },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom' } },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { callback: (v) => formatCurrency(v) },
        },
      },
    },
  });
}

function renderBudgetUsageDonut() {
  destroyChart('bud');
  const canvas = document.getElementById('chart-budget-usage');
  if (!canvas || _statsList.length === 0) return;

  const enabled = _statsList.filter((s) => s.enabled && s.spent > 0);
  if (enabled.length === 0) return;

  const colors = ['#FF6B6B','#4ECDC4','#45B7D1','#96CEB4','#FBBF24','#DDA0DD','#98D8C8','#B0B0B0'];

  chartInstances.bud = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: enabled.map((s) => s.categoryName),
      datasets: [{
        data: enabled.map((s) => s.spent),
        backgroundColor: colors.slice(0, enabled.length),
        borderWidth: 2,
        borderColor: getComputedStyle(document.documentElement).getPropertyValue('--color-surface').trim() || '#fff',
      }],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom' },
        tooltip: { callbacks: { label: (ctx) => ` ${ctx.label}: ${formatCurrency(ctx.raw)}` } },
      },
    },
  });
}

function renderSpendingTrendChart() {
  destroyChart('btrend');
  const canvas = document.getElementById('chart-spending-trend');
  if (!canvas) return;

  const cycle = getCurrentCycle();
  const cycleTransactions = _transactions.filter(
    (t) => t.date >= cycle.start && t.date <= cycle.end
  );
  const { labels, actual, ideal } = buildTrendData(cycleTransactions, _summary.totalBudget, _meta);

  if (labels.length === 0) return;

  chartInstances.btrend = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: t('budget.actualSpending'),
          data: actual,
          borderColor: '#DC2626',
          backgroundColor: 'rgba(220,38,38,0.08)',
          tension: 0.3,
          fill: true,
          pointRadius: 3,
        },
        {
          label: t('budget.idealPace'),
          data: ideal,
          borderColor: '#5B6AF0',
          borderDash: [6, 3],
          tension: 0.1,
          fill: false,
          pointRadius: 0,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom' } },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { callback: (v) => formatCurrency(v) },
        },
      },
    },
  });
}

// ─── Dashboard widget ─────────────────────────────────────────────────────────

function renderDashboardSafeSpend() {
  const el = document.getElementById('dash-safe-spend');
  if (!el) return;

  const { safeDaily, overallStatus, totalBudget } = _summary;

  if (totalBudget === 0) {
    el.innerHTML = `<span class="muted" style="font-size:0.8rem">${t('budget.setBudgetHint')}</span>`;
    return;
  }

  const icon  = { ok: '🟢', warning: '🟡', danger: '🟠', over: '🔴' }[overallStatus] || '🟢';
  const label = { ok: t('dashboard.withinBudget'), warning: t('dashboard.nearLimit'), danger: t('dashboard.caution'), over: t('dashboard.overBudget') }[overallStatus] || '';

  el.innerHTML = `
    <div class="safe-spend-amount">${formatCurrency(safeDaily)}</div>
    <div class="safe-spend-label">${icon} ${label}</div>
    <div class="safe-spend-sub">Recommended daily spending</div>`;
}

function renderDashboardBudgetWidget() {
  const el = document.getElementById('dash-budget-widget');
  if (!el) return;

  if (_statsList.length === 0) {
    el.innerHTML = `<p class="muted" style="font-size:0.8rem">${t('budget.noBudgets')} <a href="budget.html">${t('dashboard.addBudgetsLink')}</a></p>`;
    return;
  }

  // Show up to 5 categories, sorted by urgency
  const sorted = [..._statsList]
    .filter((s) => s.enabled)
    .sort((a, b) => b.pctUsedRaw - a.pctUsedRaw)
    .slice(0, 5);

  el.innerHTML = sorted.map((s) => {
    const barColor = { ok: 'var(--budget-ok)', warning: 'var(--budget-warning)', danger: 'var(--budget-danger)', over: 'var(--budget-over)' }[s.status];
    const fillPct  = Math.min(100, s.pctUsed).toFixed(0);
    return `
      <div class="dash-bcat">
        <div class="dash-bcat__row">
          <span class="dash-bcat__name">${catIcon(s.categoryName)} ${escHtml(s.categoryName)}</span>
          <span class="dash-bcat__amounts">${formatCurrency(s.spent)} / ${formatCurrency(s.budgetAmount)}</span>
        </div>
        <div class="bcat-bar bcat-bar--sm">
          <div class="bcat-bar__fill" style="width:${fillPct}%;background:${barColor}"></div>
        </div>
        <div class="dash-bcat__foot">
          <span>${fillPct}%</span>
          <span>Safe/day: ${formatCurrency(s.safeDaily)}</span>
        </div>
      </div>`;
  }).join('');
}

// ─── Refresh (called after any data change) ───────────────────────────────────

async function refresh() {
  await refreshData();
  renderBudgetSummaryCard();
  renderBudgetAlerts();
  renderCategoryBudgetList();
  renderBudgetCharts();
}

// ─── Utils ────────────────────────────────────────────────────────────────────

function escHtml(str = '') {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function catIcon(name = '') {
  const icons = {
    food: '🍔', transport: '🚗', bills: '📄', shopping: '🛍️',
    entertainment: '🎬', healthcare: '🏥', education: '📚', others: '📦',
  };
  return icons[name.toLowerCase()] || '📦';
}
