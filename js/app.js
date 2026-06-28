/**
 * app.js — Application bootstrap & shared utilities
 * Handles: theme, routing, global state, shared helpers.
 */

import { initDB, seedCategories, getSetting, setSetting, getAllSettings } from './storage.js';
import { initI18n, t, tc, setLang, currentLang, applyToDOM, parseNLBilingual } from './i18n.js';

// Re-export i18n helpers so every module imports from one place
export { t, tc, setLang, currentLang, applyToDOM };

// ─── Global App State ─────────────────────────────────────────────────────────

export const AppState = {
  theme: 'light',         // 'light' | 'dark'
  currency: 'MYR',
  currencySymbol: 'RM',
  cycleStartDay: 1,       // Day of month the accounting cycle begins
  lang: 'en',             // 'en' | 'zh-CN'
  categories: [],
  currentPage: 'dashboard',
};

// ─── Bootstrap ────────────────────────────────────────────────────────────────

export async function initApp() {
  try {
    await initDB();
    await seedCategories();
    await initI18n();              // ← load locale before anything renders
    await loadSettings();
    applyTheme(AppState.theme);
    setupNavigation();
    setupThemeToggle();
    applyToDOM();                  // ← stamp data-i18n attributes
    console.log('[BudgetApp] Initialised ✓');
  } catch (err) {
    console.error('[BudgetApp] Init error:', err);
  }
}

// ─── Settings ─────────────────────────────────────────────────────────────────

async function loadSettings() {
  const settings = await getAllSettings();
  if (settings.theme) AppState.theme = settings.theme;
  if (settings.currency) AppState.currency = settings.currency;
  if (settings.currencySymbol) AppState.currencySymbol = settings.currencySymbol;
  if (settings.cycleStartDay) AppState.cycleStartDay = Number(settings.cycleStartDay);
  if (settings.lang) AppState.lang = settings.lang;
}

// ─── Theme ────────────────────────────────────────────────────────────────────

export function applyTheme(theme) {
  AppState.theme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  const icon = document.getElementById('theme-icon');
  if (icon) icon.textContent = theme === 'dark' ? '☀️' : '🌙';

  // Swap mascot logo for dark/light variant
  document.querySelectorAll('.sidebar__logo-img').forEach(img => {
    img.src = theme === 'dark'
      ? 'assets/icons/logo-icon-dark.svg'
      : 'assets/icons/logo-icon.svg';
  });
}

function setupThemeToggle() {
  document.querySelectorAll('#theme-toggle').forEach(btn => {
    btn.addEventListener('click', async () => {
      const next = AppState.theme === 'light' ? 'dark' : 'light';
      applyTheme(next);
      await setSetting('theme', next);
    });
  });
}

// ─── Navigation ───────────────────────────────────────────────────────────────

function setupNavigation() {
  const navLinks = document.querySelectorAll('[data-nav]');
  navLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = link.getAttribute('data-nav');
      navigateTo(target);
    });
  });

  // Highlight current page
  const current = getCurrentPage();
  highlightNav(current);
}

export function navigateTo(page) {
  const pages = {
    dashboard: 'index.html',
    chat: 'index.html#chat',
    calendar: 'calendar.html',
    transactions: 'index.html#transactions',
    reports: 'reports.html',
    settings: 'settings.html',
  };
  if (pages[page]) window.location.href = pages[page];
}

function getCurrentPage() {
  const path = window.location.pathname;
  if (path.includes('calendar')) return 'calendar';
  if (path.includes('reports')) return 'reports';
  if (path.includes('settings')) return 'settings';
  return 'dashboard';
}

function highlightNav(page) {
  document.querySelectorAll('[data-nav]').forEach((el) => {
    el.classList.toggle('active', el.getAttribute('data-nav') === page);
  });
}

// ─── Formatters ───────────────────────────────────────────────────────────────

export function formatCurrency(amount) {
  const sym = AppState.currencySymbol;
  return `${sym}${Math.abs(amount).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateInput(date = new Date()) {
  return date.toISOString().split('T')[0];
}

export function todayStr() {
  return formatDateInput(new Date());
}

// ─── Accounting Cycle ─────────────────────────────────────────────────────────

export function getCurrentCycle() {
  const today = new Date();
  const day = today.getDate();
  const startDay = AppState.cycleStartDay;

  let cycleStart, cycleEnd;

  if (day >= startDay) {
    cycleStart = new Date(today.getFullYear(), today.getMonth(), startDay);
    cycleEnd = new Date(today.getFullYear(), today.getMonth() + 1, startDay - 1);
  } else {
    cycleStart = new Date(today.getFullYear(), today.getMonth() - 1, startDay);
    cycleEnd = new Date(today.getFullYear(), today.getMonth(), startDay - 1);
  }

  return {
    start: formatDateInput(cycleStart),
    end: formatDateInput(cycleEnd),
    label: `${formatDate(formatDateInput(cycleStart))} – ${formatDate(formatDateInput(cycleEnd))}`,
  };
}

// ─── Toast Notifications ──────────────────────────────────────────────────────

export function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('toast--visible'));

  setTimeout(() => {
    toast.classList.remove('toast--visible');
    toast.addEventListener('transitionend', () => toast.remove());
  }, 3000);
}

// ─── Modal helpers ────────────────────────────────────────────────────────────

export function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.add('modal--open');
    document.body.style.overflow = 'hidden';
  }
}

export function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.remove('modal--open');
    document.body.style.overflow = '';
  }
}

// Close modal on backdrop click
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal')) {
    e.target.classList.remove('modal--open');
    document.body.style.overflow = '';
  }
});

// ─── Natural Language Parser — bilingual (delegated to i18n.js) ──────────────

export function parseNaturalLanguage(text) {
  return parseNLBilingual(text);
}
