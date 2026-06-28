/**
 * recurring.js — Recurring transaction management
 * All UI strings via t() from app.js.
 */

import {
  getAllRecurring, addRecurring, updateRecurring, deleteRecurring, addTransaction,
} from './storage.js';
import { getAllCategories } from './storage.js';
import { formatCurrency, showToast, todayStr, t, tc } from './app.js';

let recurringList = [];
let categories    = [];

const WEEKDAYS_EN = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

export async function initRecurring() {
  [recurringList, categories] = await Promise.all([getAllRecurring(), getAllCategories()]);
  renderList();
  setupFormListeners();
  document.addEventListener('langchange', () => { renderList(); });
}

function renderList() {
  const container = document.getElementById('recurring-list');
  if (!container) return;

  if (recurringList.length === 0) {
    container.innerHTML = `<div class="empty-state">
      <span class="empty-state__icon">🔄</span>
      <p>${t('settings.recEmpty')}</p>
    </div>`;
    return;
  }

  container.innerHTML = recurringList.map(recurringCard).join('');

  container.querySelectorAll('[data-edit-recurring]').forEach((btn) => {
    btn.addEventListener('click', () => openEdit(Number(btn.dataset.editRecurring)));
  });
  container.querySelectorAll('[data-delete-recurring]').forEach((btn) => {
    btn.addEventListener('click', () => doDelete(Number(btn.dataset.deleteRecurring)));
  });
  container.querySelectorAll('[data-apply-recurring]').forEach((btn) => {
    btn.addEventListener('click', () => applyToday(Number(btn.dataset.applyRecurring)));
  });
}

function recurringCard(r) {
  const freqLabel = r.frequency === 'monthly'
    ? t('settings.recMonthly', { day: r.dayOfMonth || 1 })
    : t('settings.recWeekly',  { day: WEEKDAYS_EN[r.dayOfWeek || 1] });

  const typeClass = r.type === 'income' ? 'tag--income' : 'tag--expense';

  return `
    <div class="recurring-card">
      <div class="recurring-card__left">
        <span class="recurring-card__icon">${r.icon || '🔄'}</span>
        <div class="recurring-card__info">
          <span class="recurring-card__name">${escHtml(r.name)}</span>
          <span class="recurring-card__freq">${freqLabel}</span>
          <span class="tag ${typeClass}">${t('transactionTypes.' + r.type)}</span>
        </div>
      </div>
      <div class="recurring-card__right">
        <span class="recurring-card__amount">${formatCurrency(r.amount)}</span>
        <div class="recurring-card__actions">
          <button class="btn btn--ghost btn--sm" data-apply-recurring="${r.id}">${t('settings.recApply')}</button>
          <button class="icon-btn" data-edit-recurring="${r.id}">✏️</button>
          <button class="icon-btn" data-delete-recurring="${r.id}">🗑️</button>
        </div>
      </div>
    </div>`;
}

function setupFormListeners() {
  const form = document.getElementById('recurring-form');
  if (!form) return;

  populateCategorySelect(form.querySelector('#rec-category'));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data   = gatherForm(form);
    const editId = form.dataset.editId;
    if (!data.name || !data.amount) { showToast(t('toast.budgetRequired'), 'error'); return; }

    if (editId) {
      await updateRecurring(Number(editId), data);
      showToast(t('toast.recurringUpdated'));
      delete form.dataset.editId;
      form.querySelector('[type="submit"]').textContent = t('settings.recAdd');
    } else {
      await addRecurring(data);
      showToast(t('toast.recurringAdded'));
    }
    form.reset();
    recurringList = await getAllRecurring();
    renderList();
  });

  form.querySelector('#rec-cancel')?.addEventListener('click', () => {
    form.reset();
    delete form.dataset.editId;
    form.querySelector('[type="submit"]').textContent = t('settings.recAdd');
  });
}

function gatherForm(form) {
  return {
    name:       form.querySelector('#rec-name').value.trim(),
    amount:     parseFloat(form.querySelector('#rec-amount').value),
    type:       form.querySelector('#rec-type').value,
    category:   form.querySelector('#rec-category').value,
    frequency:  form.querySelector('#rec-frequency').value,
    dayOfMonth: parseInt(form.querySelector('#rec-day-of-month')?.value) || 1,
    dayOfWeek:  parseInt(form.querySelector('#rec-day-of-week')?.value)  || 1,
    active:     true,
    icon:       form.querySelector('#rec-icon')?.value || '🔄',
  };
}

function populateCategorySelect(select) {
  if (!select) return;
  select.innerHTML = categories.map((c) => `<option value="${c.name}">${tc(c.name)}</option>`).join('');
}

function openEdit(id) {
  const r    = recurringList.find((x) => x.id === id);
  const form = document.getElementById('recurring-form');
  if (!r || !form) return;

  form.dataset.editId = id;
  form.querySelector('#rec-name').value        = r.name;
  form.querySelector('#rec-amount').value      = r.amount;
  form.querySelector('#rec-type').value        = r.type;
  form.querySelector('#rec-category').value    = r.category;
  form.querySelector('#rec-frequency').value   = r.frequency;
  if (form.querySelector('#rec-day-of-month')) form.querySelector('#rec-day-of-month').value = r.dayOfMonth || 1;
  if (form.querySelector('#rec-icon'))         form.querySelector('#rec-icon').value = r.icon || '🔄';
  form.querySelector('[type="submit"]').textContent = t('settings.recSave');
  form.scrollIntoView({ behavior: 'smooth' });
}

async function doDelete(id) {
  if (!confirm(t('confirm.deleteTransaction'))) return;
  await deleteRecurring(id);
  recurringList = await getAllRecurring();
  renderList();
  showToast(t('toast.recurringDeleted'));
}

async function applyToday(id) {
  const r = recurringList.find((x) => x.id === id);
  if (!r) return;
  await addTransaction({
    type: r.type, amount: r.amount, category: r.category,
    description: r.name, date: todayStr(), tags: ['recurring'],
  });
  showToast(`"${r.name}" ${t('toast.recurringApplied')}`);
}

function escHtml(str = '') {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
