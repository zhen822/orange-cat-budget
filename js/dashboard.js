/**
 * dashboard.js — Dashboard page logic
 * All UI strings via t() from app.js (re-exported from i18n.js).
 */

import {
  getAllTransactions,
  getAllRecurring,
  getAllSavingsGoals,
} from './storage.js';
import {
  formatCurrency,
  formatDate,
  todayStr,
  getCurrentCycle,
  AppState,
  t,
  tc,
} from './app.js';

// ─── Entry Point ──────────────────────────────────────────────────────────────

export async function renderDashboard() {
  const [transactions, recurring, goals] = await Promise.all([
    getAllTransactions(),
    getAllRecurring(),
    getAllSavingsGoals(),
  ]);

  const cycle = getCurrentCycle();
  const cycleTransactions = transactions.filter(
    (tx) => tx.date >= cycle.start && tx.date <= cycle.end
  );

  renderSummaryCards(cycleTransactions, cycle);
  renderTodaySpending(transactions);
  renderWeekSpending(transactions);
  renderRecentTransactions(transactions);
  renderUpcomingRecurring(recurring);
  renderSavingsProgress(goals, transactions);
}

// ─── Summary Cards ────────────────────────────────────────────────────────────

function renderSummaryCards(transactions, cycle) {
  const income   = transactions.filter((tx) => tx.type === 'income').reduce((s, tx) => s + tx.amount, 0);
  const expenses = transactions.filter((tx) => tx.type === 'expense').reduce((s, tx) => s + tx.amount, 0);
  const savings  = transactions.filter((tx) => tx.type === 'savings').reduce((s, tx) => s + tx.amount, 0);
  const balance  = income - expenses - savings;

  setEl('summary-income',   formatCurrency(income));
  setEl('summary-expenses', formatCurrency(expenses));
  setEl('summary-savings',  formatCurrency(savings));
  setEl('summary-balance',  formatCurrency(balance));
  setEl('cycle-label',      cycle.label);

  const balanceCard = document.querySelector('.card--balance .card__amount');
  if (balanceCard) {
    balanceCard.style.color = balance >= 0 ? 'var(--color-income)' : 'var(--color-expense)';
  }
}

// ─── Today Spending ───────────────────────────────────────────────────────────

function renderTodaySpending(transactions) {
  const today = todayStr();
  const total = transactions
    .filter((tx) => tx.date === today && tx.type === 'expense')
    .reduce((s, tx) => s + tx.amount, 0);
  setEl('today-spending', formatCurrency(total));
}

// ─── Week Spending ────────────────────────────────────────────────────────────

function renderWeekSpending(transactions) {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  const startStr = startOfWeek.toISOString().split('T')[0];
  const total = transactions
    .filter((tx) => tx.date >= startStr && tx.type === 'expense')
    .reduce((s, tx) => s + tx.amount, 0);
  setEl('week-spending', formatCurrency(total));
}

// ─── Recent Transactions ──────────────────────────────────────────────────────

function renderRecentTransactions(transactions) {
  const container = document.getElementById('recent-transactions');
  if (!container) return;

  const sorted = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 8);

  if (sorted.length === 0) {
    container.innerHTML = `<div class="empty-state">
      <span class="empty-state__icon">📭</span>
      <p>${t('dashboard.noTransactions')}</p>
    </div>`;
    return;
  }

  container.innerHTML = sorted.map((tx) => transactionRow(tx)).join('');
}

function transactionRow(tx) {
  const typeClass = tx.type === 'income' ? 'tx--income' : tx.type === 'savings' ? 'tx--savings' : 'tx--expense';
  const sign = tx.type === 'income' ? '+' : '-';
  const catDisplay = tc(tx.category);
  return `
    <div class="tx-row ${typeClass}">
      <div class="tx-row__icon">${categoryIcon(tx.category)}</div>
      <div class="tx-row__info">
        <span class="tx-row__desc">${escHtml(tx.description)}</span>
        <span class="tx-row__meta">${escHtml(catDisplay)} · ${formatDate(tx.date)}</span>
      </div>
      <div class="tx-row__amount">${sign}${formatCurrency(tx.amount)}</div>
    </div>`;
}

// ─── Upcoming Recurring ───────────────────────────────────────────────────────

function renderUpcomingRecurring(recurring) {
  const container = document.getElementById('upcoming-recurring');
  if (!container) return;

  const today = new Date();
  const upcoming = recurring
    .filter((r) => r.active !== false)
    .map((r) => ({ ...r, nextDate: getNextOccurrence(r, today) }))
    .filter((r) => r.nextDate)
    .sort((a, b) => a.nextDate - b.nextDate)
    .slice(0, 5);

  if (upcoming.length === 0) {
    container.innerHTML = `<p class="muted">${t('dashboard.noRecurring')}</p>`;
    return;
  }

  container.innerHTML = upcoming.map((r) => {
    const daysUntil = Math.ceil((r.nextDate - today) / 86400000);
    const badge = daysUntil <= 3 ? 'badge--urgent' : daysUntil <= 7 ? 'badge--soon' : '';
    return `
      <div class="recurring-row">
        <span class="recurring-row__icon">${r.icon || '🔄'}</span>
        <div class="recurring-row__info">
          <span class="recurring-row__name">${escHtml(r.name)}</span>
          <span class="recurring-row__date">${formatDate(r.nextDate.toISOString().split('T')[0])}</span>
        </div>
        <div class="recurring-row__right">
          <span class="recurring-row__amount">${formatCurrency(r.amount)}</span>
          <span class="badge ${badge}">${daysUntil === 0 ? t('dashboard.today') : `${daysUntil}d`}</span>
        </div>
      </div>`;
  }).join('');
}

function getNextOccurrence(recurring, from) {
  const today = new Date(from);
  today.setHours(0, 0, 0, 0);
  if (recurring.frequency === 'monthly') {
    const day = recurring.dayOfMonth || 1;
    let next = new Date(today.getFullYear(), today.getMonth(), day);
    if (next <= today) next.setMonth(next.getMonth() + 1);
    return next;
  }
  if (recurring.frequency === 'weekly') {
    const dow  = recurring.dayOfWeek || 1;
    const diff = (dow - today.getDay() + 7) % 7 || 7;
    return new Date(today.getTime() + diff * 86400000);
  }
  return null;
}

// ─── Savings Progress ─────────────────────────────────────────────────────────

function renderSavingsProgress(goals, transactions) {
  const container = document.getElementById('savings-goals');
  if (!container) return;

  if (goals.length === 0) {
    container.innerHTML = `<p class="muted">${t('dashboard.noSavingsGoals')}</p>`;
    return;
  }

  container.innerHTML = goals.map((g) => {
    const saved = transactions
      .filter((tx) => tx.type === 'savings' && tx.savingsGoalId === g.id)
      .reduce((s, tx) => s + tx.amount, 0);
    const pct = Math.min(100, (saved / g.target) * 100).toFixed(0);
    return `
      <div class="goal-item">
        <div class="goal-item__header">
          <span>${escHtml(g.name)}</span>
          <span>${formatCurrency(saved)} / ${formatCurrency(g.target)}</span>
        </div>
        <div class="progress-bar">
          <div class="progress-bar__fill" style="width:${pct}%"></div>
        </div>
        <div class="goal-item__pct">${pct}%</div>
      </div>`;
  }).join('');
}

// ─── Utils ────────────────────────────────────────────────────────────────────

function setEl(id, html) {
  const el = document.getElementById(id);
  if (el) el.textContent = html;
}

function escHtml(str = '') {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function categoryIcon(cat = '') {
  const icons = {
    food: '🍔', transport: '🚗', bills: '📄', shopping: '🛍️',
    entertainment: '🎬', healthcare: '🏥', education: '📚',
    salary: '💼', freelance: '💻', business: '🏢', investments: '📈',
    'emergency fund': '🛡️', vacation: '✈️', retirement: '🌅',
    // Chinese aliases
    '餐饮': '🍔', '交通': '🚗', '账单': '📄', '购物': '🛍️',
    '娱乐': '🎬', '医疗': '🏥', '教育': '📚',
  };
  return icons[cat.toLowerCase()] || icons[cat] || '📦';
}
