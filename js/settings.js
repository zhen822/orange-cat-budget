/**
 * settings.js — User preferences, custom categories, savings goals, cycle config.
 * All UI strings via t() from app.js.
 */

import {
  getSetting, setSetting, getAllSettings,
  getAllCategories, addCategory, deleteCategory,
  getAllSavingsGoals, addSavingsGoal, deleteSavingsGoal,
  exportAllData,
} from './storage.js';
import { AppState, applyTheme, formatCurrency, showToast, setLang, t, tc, applyToDOM } from './app.js';

export async function initSettings() {
  await loadPreferences();
  await renderCategories();
  await renderSavingsGoals();
  setupListeners();

  // Re-apply on language switch
  document.addEventListener('langchange', async () => {
    applyToDOM();
    await renderCategories();
    await renderSavingsGoals();
  });
}

async function loadPreferences() {
  const settings = await getAllSettings();

  const cycleInput = document.getElementById('cycle-start-day');
  if (cycleInput && settings.cycleStartDay) cycleInput.value = settings.cycleStartDay;

  const currencySelect = document.getElementById('currency-select');
  if (currencySelect && settings.currency) currencySelect.value = settings.currency;

  const themeRadios = document.querySelectorAll('[name="theme"]');
  themeRadios.forEach((r) => { r.checked = r.value === (settings.theme || 'light'); });

  const langSelect = document.getElementById('lang-select');
  if (langSelect && settings.lang) langSelect.value = settings.lang;
}

function setupListeners() {
  document.getElementById('cycle-start-day')?.addEventListener('change', async (e) => {
    const val = Math.min(28, Math.max(1, Number(e.target.value)));
    AppState.cycleStartDay = val;
    await setSetting('cycleStartDay', val);
    showToast(t('toast.cycleSaved'));
  });

  document.getElementById('currency-select')?.addEventListener('change', async (e) => {
    const map = { MYR: 'RM', USD: '$', EUR: '€', SGD: 'S$', GBP: '£' };
    AppState.currency = e.target.value;
    AppState.currencySymbol = map[e.target.value] || e.target.value;
    await setSetting('currency', e.target.value);
    await setSetting('currencySymbol', AppState.currencySymbol);
    showToast(t('toast.currencySaved'));
  });

  document.querySelectorAll('[name="theme"]').forEach((r) => {
    r.addEventListener('change', async (e) => {
      applyTheme(e.target.value);
      await setSetting('theme', e.target.value);
      showToast(e.target.value === 'dark' ? t('toast.darkMode') : t('toast.lightMode'));
    });
  });

  // Language switcher
  document.getElementById('lang-select')?.addEventListener('change', async (e) => {
    const lang = e.target.value;
    AppState.lang = lang;
    await setLang(lang);
    showToast(t('toast.langChanged'));
  });

  document.getElementById('cat-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name  = document.getElementById('cat-name')?.value.trim();
    const type  = document.getElementById('cat-type')?.value;
    const icon  = document.getElementById('cat-icon')?.value.trim() || '📦';
    const color = document.getElementById('cat-color')?.value || '#888888';
    if (!name) { showToast(t('toast.catNameRequired'), 'error'); return; }
    await addCategory({ name, type, icon, color });
    showToast(t('toast.catAdded'));
    e.target.reset();
    await renderCategories();
  });

  document.getElementById('goal-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name   = document.getElementById('goal-name')?.value.trim();
    const target = parseFloat(document.getElementById('goal-target')?.value);
    if (!name || !target) { showToast(t('toast.goalRequired'), 'error'); return; }
    await addSavingsGoal({ name, target });
    showToast(t('toast.goalAdded'));
    e.target.reset();
    await renderSavingsGoals();
  });

  document.getElementById('export-btn')?.addEventListener('click', async () => {
    const data = await exportAllData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `budget-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(t('toast.exported'));
  });

  document.getElementById('export-csv-btn')?.addEventListener('click', exportCSV);
}

async function renderCategories() {
  const container = document.getElementById('categories-list');
  if (!container) return;
  const cats = await getAllCategories();
  container.innerHTML = cats.map(catRow).join('');

  container.querySelectorAll('[data-delete-cat]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id  = Number(btn.dataset.deleteCat);
      const cat = cats.find((c) => c.id === id);
      if (cat?.isDefault) { showToast(t('toast.catDefaultError'), 'error'); return; }
      if (!confirm(`${t('confirm.deleteCategory')} "${tc(cat?.name) || cat?.name}"?`)) return;
      await deleteCategory(id);
      await renderCategories();
      showToast(t('toast.catDeleted'));
    });
  });
}

function catRow(c) {
  return `
    <div class="cat-row">
      <span class="cat-row__icon" style="background:${c.color || '#888'}">${c.icon || '📦'}</span>
      <div class="cat-row__info">
        <span class="cat-row__name">${escHtml(tc(c.name))}</span>
        <span class="tag tag--${c.type}">${t('transactionTypes.' + c.type)}</span>
        ${c.isDefault ? `<span class="tag">${t('settings.catDefault')}</span>` : ''}
      </div>
      ${!c.isDefault ? `<button class="icon-btn" data-delete-cat="${c.id}" title="Delete">🗑️</button>` : ''}
    </div>`;
}

async function renderSavingsGoals() {
  const container = document.getElementById('goals-list');
  if (!container) return;
  const goals = await getAllSavingsGoals();

  if (goals.length === 0) {
    container.innerHTML = `<p class="muted">${t('settings.noGoals')}</p>`;
    return;
  }

  container.innerHTML = goals.map((g) => `
    <div class="goal-row">
      <div class="goal-row__info">
        <span class="goal-row__name">${escHtml(g.name)}</span>
        <span class="goal-row__target">${t('settings.goalTarget2')}: ${formatCurrency(g.target)}</span>
      </div>
      <button class="icon-btn" data-delete-goal="${g.id}" title="Delete">🗑️</button>
    </div>`).join('');

  container.querySelectorAll('[data-delete-goal]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await deleteSavingsGoal(Number(btn.dataset.deleteGoal));
      await renderSavingsGoals();
      showToast(t('toast.goalRemoved'));
    });
  });
}

async function exportCSV() {
  const { transactions } = await exportAllData();
  const header = 'Date,Type,Category,Description,Amount\n';
  const rows   = transactions.map((tx) =>
    `${tx.date},${tx.type},${tx.category},"${tx.description?.replace(/"/g, '""') || ''}",${tx.amount}`
  ).join('\n');
  const blob = new Blob([header + rows], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast(t('toast.csvExported'));
}

function escHtml(str = '') {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
