/**
 * charts.js — Chart rendering using Chart.js
 * All chart instances are managed here for proper cleanup.
 */

import { getAllTransactions } from './storage.js';
import { formatCurrency, getCurrentCycle, AppState, t } from './app.js';

const chartInstances = {};

function destroyChart(id) {
  if (chartInstances[id]) {
    chartInstances[id].destroy();
    delete chartInstances[id];
  }
}

function getCSSVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

// ─── Entry Point ──────────────────────────────────────────────────────────────

export async function renderReports(period = 'monthly') {
  const transactions = await getAllTransactions();
  renderSummaryCards(transactions);
  renderSpendingChart(transactions, period);
  renderCategoryChart(transactions, period);
  renderIncomeVsExpense(transactions);
}

// ─── Summary Cards ────────────────────────────────────────────────────────────

function renderSummaryCards(transactions) {
  const cycle = getCurrentCycle();
  const cycleTransactions = transactions.filter(
    (t) => t.date >= cycle.start && t.date <= cycle.end
  );

  const income = cycleTransactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expenses = cycleTransactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const savings = cycleTransactions.filter((t) => t.type === 'savings').reduce((s, t) => s + t.amount, 0);
  const balance = income - expenses - savings;

  setEl('r-income', formatCurrency(income));
  setEl('r-expenses', formatCurrency(expenses));
  setEl('r-savings', formatCurrency(savings));
  setEl('r-balance', formatCurrency(balance));
}

// ─── Spending trend chart (daily/weekly/monthly) ──────────────────────────────

function renderSpendingChart(transactions, period) {
  destroyChart('spending');
  const canvas = document.getElementById('chart-spending');
  if (!canvas) return;

  const expenses = transactions.filter((t) => t.type === 'expense');
  const { labels, data } = aggregateByPeriod(expenses, period);

  chartInstances.spending = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Expenses',
        data,
        borderColor: '#F97316',
        backgroundColor: 'rgba(249,115,22,0.08)',
        tension: 0.4,
        fill: true,
        pointRadius: 4,
        pointHoverRadius: 6,
      }],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { callback: (v) => formatCurrency(v) },
        },
      },
    },
  });
}

function aggregateByPeriod(transactions, period) {
  const map = new Map();

  transactions.forEach((t) => {
    let key;
    const d = new Date(t.date);
    if (period === 'daily') {
      key = t.date;
    } else if (period === 'weekly') {
      const week = getISOWeek(d);
      key = `W${week} ${d.getFullYear()}`;
    } else {
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }
    map.set(key, (map.get(key) || 0) + t.amount);
  });

  const sorted = [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  return { labels: sorted.map(([k]) => k), data: sorted.map(([, v]) => v) };
}

function getISOWeek(d) {
  const date = new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const week1 = new Date(date.getFullYear(), 0, 4);
  return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}

// ─── Category donut chart ─────────────────────────────────────────────────────

function renderCategoryChart(transactions, period) {
  destroyChart('category');
  const canvas = document.getElementById('chart-category');
  if (!canvas) return;

  const expenses = transactions.filter((t) => t.type === 'expense');
  const catMap = new Map();
  expenses.forEach((t) => {
    catMap.set(t.category, (catMap.get(t.category) || 0) + t.amount);
  });

  if (catMap.size === 0) return;

  const sorted = [...catMap.entries()].sort((a, b) => b[1] - a[1]);
  const colors = ['#FF6B6B','#4ECDC4','#45B7D1','#96CEB4','#FFEAA7','#DDA0DD','#98D8C8','#B0B0B0'];

  chartInstances.category = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: sorted.map(([k]) => k),
      datasets: [{
        data: sorted.map(([, v]) => v),
        backgroundColor: colors.slice(0, sorted.length),
        borderWidth: 2,
        borderColor: getCSSVar('--color-surface') || '#ffffff',
      }],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom' },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.label}: ${formatCurrency(ctx.raw)}`,
          },
        },
      },
    },
  });
}

// ─── Income vs Expense bar chart ──────────────────────────────────────────────

function renderIncomeVsExpense(transactions) {
  destroyChart('incomeVsExpense');
  const canvas = document.getElementById('chart-income-expense');
  if (!canvas) return;

  // Last 6 months
  const monthMap = new Map();
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthMap.set(key, { income: 0, expense: 0, savings: 0 });
  }

  transactions.forEach((t) => {
    const key = t.date.substring(0, 7);
    if (monthMap.has(key)) {
      monthMap.get(key)[t.type] += t.amount;
    }
  });

  const labels = [...monthMap.keys()].map((k) => {
    const [y, m] = k.split('-');
    return new Date(y, m - 1).toLocaleDateString('en-MY', { month: 'short', year: '2-digit' });
  });

  const incomeData = [...monthMap.values()].map((v) => v.income);
  const expenseData = [...monthMap.values()].map((v) => v.expense);
  const savingsData = [...monthMap.values()].map((v) => v.savings);

  chartInstances.incomeVsExpense = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: t('transactionTypes.income'),  data: incomeData,  backgroundColor: '#16A34A' },
        { label: t('transactionTypes.expense'), data: expenseData, backgroundColor: '#DC2626' },
        { label: t('transactionTypes.savings'), data: savingsData, backgroundColor: '#2563EB' },
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

// ─── Utils ────────────────────────────────────────────────────────────────────

function setEl(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

// ─── Period switcher ──────────────────────────────────────────────────────────

export function setupPeriodSwitcher() {
  document.querySelectorAll('[data-period]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      document.querySelectorAll('[data-period]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      await renderReports(btn.dataset.period);
    });
  });
}
