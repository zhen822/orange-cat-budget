/**
 * calendar.js — Monthly calendar view
 * Shows daily expenses, income totals per day.
 */

import { getAllTransactions } from './storage.js';
import { formatCurrency, formatDate, AppState, t } from './app.js';

let currentYear, currentMonth;
let allTransactions = [];

// ─── Entry Point ──────────────────────────────────────────────────────────────

export async function initCalendar() {
  const now = new Date();
  currentYear = now.getFullYear();
  currentMonth = now.getMonth();

  allTransactions = await getAllTransactions();

  renderCalendar();
  setupCalendarControls();
}

// ─── Render calendar grid ─────────────────────────────────────────────────────

function renderCalendar() {
  const grid = document.getElementById('calendar-grid');
  const monthLabel = document.getElementById('cal-month-label');
  if (!grid || !monthLabel) return;

  const label = new Date(currentYear, currentMonth, 1).toLocaleDateString('en-MY', {
    month: 'long', year: 'numeric',
  });
  monthLabel.textContent = label;

  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  let html = '';

  // Day-of-week headers — translated
  const weekdays = t('weekdays') !== 'weekdays'
    ? JSON.parse(JSON.stringify(t('weekdays'))) // already an array from locale
    : ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  // t() returns the raw array since JSON allows arrays as values
  const wdArr = Array.isArray(weekdays) ? weekdays : ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  wdArr.forEach((d) => {
    html += `<div class="cal-header-cell">${d}</div>`;
  });

  // Blank cells before first day
  for (let i = 0; i < firstDay; i++) {
    html += `<div class="cal-cell cal-cell--empty"></div>`;
  }

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayTx = allTransactions.filter((t) => t.date === dateStr);
    const income = dayTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = dayTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    const isToday = dateStr === todayStr;
    const hasTx = dayTx.length > 0;

    html += `
      <div class="cal-cell ${isToday ? 'cal-cell--today' : ''} ${hasTx ? 'cal-cell--has-data' : ''}" data-date="${dateStr}">
        <span class="cal-cell__day">${day}</span>
        ${income > 0 ? `<span class="cal-cell__income">+${formatCurrency(income)}</span>` : ''}
        ${expense > 0 ? `<span class="cal-cell__expense">-${formatCurrency(expense)}</span>` : ''}
      </div>`;
  }

  grid.innerHTML = html;

  // Attach click handlers
  grid.querySelectorAll('.cal-cell[data-date]').forEach((cell) => {
    cell.addEventListener('click', () => openDayDetail(cell.dataset.date));
  });
}

// ─── Controls ─────────────────────────────────────────────────────────────────

function setupCalendarControls() {
  document.getElementById('cal-prev')?.addEventListener('click', () => {
    currentMonth--;
    if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    renderCalendar();
  });

  document.getElementById('cal-next')?.addEventListener('click', () => {
    currentMonth++;
    if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    renderCalendar();
  });

  document.getElementById('cal-today')?.addEventListener('click', () => {
    const now = new Date();
    currentYear = now.getFullYear();
    currentMonth = now.getMonth();
    renderCalendar();
  });
}

// ─── Day detail panel ─────────────────────────────────────────────────────────

async function openDayDetail(dateStr) {
  const panel = document.getElementById('day-detail');
  const panelDate = document.getElementById('day-detail-date');
  const panelBody = document.getElementById('day-detail-body');
  if (!panel || !panelBody) return;

  panelDate.textContent = formatDate(dateStr);

  const dayTx = allTransactions.filter((t) => t.date === dateStr);
  let html = '';

  if (dayTx.length === 0) {
    html = `<div class="empty-state"><span class="empty-state__icon">📭</span><p>Nothing recorded for this day.</p></div>`;
  }

  if (dayTx.length > 0) {
    const income = dayTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = dayTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    html += `
      <div class="day-summary">
        <span class="day-summary__income">Income: <strong>+${formatCurrency(income)}</strong></span>
        <span class="day-summary__expense">Expense: <strong>-${formatCurrency(expense)}</strong></span>
      </div>
      <div class="day-tx-list">
        ${dayTx.map(txItem).join('')}
      </div>`;
  }


  panelBody.innerHTML = html;
  panel.classList.add('day-detail--open');

  document.getElementById('day-detail-close')?.addEventListener('click', () => {
    panel.classList.remove('day-detail--open');
  }, { once: true });
}

function txItem(t) {
  const sign = t.type === 'income' ? '+' : '-';
  const cls = t.type === 'income' ? 'tx--income' : t.type === 'savings' ? 'tx--savings' : 'tx--expense';
  return `
    <div class="tx-row ${cls}">
      <span class="tx-row__icon">${categoryIcon(t.category)}</span>
      <div class="tx-row__info">
        <span class="tx-row__desc">${escHtml(t.description)}</span>
        <span class="tx-row__meta">${escHtml(t.category)}</span>
      </div>
      <span class="tx-row__amount">${sign}${formatCurrency(t.amount)}</span>
    </div>`;
}

function categoryIcon(cat = '') {
  const icons = { food: '🍔', transport: '🚗', bills: '📄', shopping: '🛍️', entertainment: '🎬', healthcare: '🏥', education: '📚', salary: '💼', freelance: '💻' };
  return icons[cat.toLowerCase()] || '📦';
}

function escHtml(str = '') {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
