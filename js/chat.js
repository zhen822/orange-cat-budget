/**
 * chat.js — Chat-based expense/income entry
 * All UI strings via t() from app.js (re-exported from i18n.js).
 */

import {
  addTransaction,
  updateTransaction,
  deleteTransaction,
  getAllTransactions,
  getAllCategories,
} from './storage.js';
import {
  formatCurrency,
  formatDate,
  todayStr,
  parseNaturalLanguage,
  showToast,
  AppState,
  t,
  tc,
  applyToDOM,
} from './app.js';

let editingId  = null;
let categories = [];

// ─── Entry Point ──────────────────────────────────────────────────────────────

export async function initChat() {
  categories = await getAllCategories();
  const recent = (await getAllTransactions())
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 20);

  renderWelcome();
  recent.reverse().forEach((tx) => appendTransactionBubble(tx));
  scrollToBottom();
  setupInputListeners();

  // Re-render welcome on language change
  document.addEventListener('langchange', () => {
    renderWelcome();
    applyToDOM();
  });
}

// ─── Welcome bubble ───────────────────────────────────────────────────────────

function renderWelcome() {
  const container = document.getElementById('chat-messages');
  if (!container) return;

  const ex = (key) => `<em>"${t('chat.examples.' + key)}"</em>`;

  container.innerHTML = `
    <div class="chat-bubble chat-bubble--bot">
      <div class="chat-bubble__avatar">🐱</div>
      <div class="chat-bubble__body">
        <p>${t('chat.welcomeTitle')}</p>
        <p>${t('chat.welcomeBody')}</p>
        <ul>
          <li>${ex('lunch')}</li>
          <li>${ex('bill')}</li>
          <li>${ex('salary')}</li>
          <li>${ex('savings')}</li>
        </ul>
        <p>${t('chat.welcomeHint')}</p>
      </div>
    </div>`;
}

// ─── Input listeners ──────────────────────────────────────────────────────────

function setupInputListeners() {
  const input   = document.getElementById('chat-input');
  const sendBtn = document.getElementById('chat-send');

  if (!input || !sendBtn) return;

  const send = () => {
    const text = input.value.trim();
    if (!text) return;
    handleUserMessage(text);
    input.value = '';
    input.focus();
  };

  sendBtn.addEventListener('click', send);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  });

  document.querySelectorAll('[data-quick]').forEach((btn) => {
    btn.addEventListener('click', () => {
      input.value = btn.dataset.quick;
      input.focus();
    });
  });

  document.getElementById('edit-cancel')?.addEventListener('click', cancelEdit);
  document.getElementById('edit-save')?.addEventListener('click', saveEdit);
}

// ─── Message handling ─────────────────────────────────────────────────────────

async function handleUserMessage(text) {
  appendUserBubble(text);
  const parsed = parseNaturalLanguage(text);

  if (!parsed.amount || parsed.amount <= 0) {
    appendBotBubble(t('chat.noAmountFound'));
    return;
  }
  showConfirmCard(parsed, text);
}

function showConfirmCard(parsed, rawText) {
  const catOptions = categories
    .filter((c) => c.type === parsed.type)
    .map((c) => `<option value="${c.name}" ${c.name === parsed.category ? 'selected' : ''}>${c.icon || ''} ${tc(c.name)}</option>`)
    .join('');

  const typeLabel = t(`transactionTypes.${parsed.type}`);

  const html = `
    <div class="confirm-card" data-pending>
      <div class="confirm-card__header">
        <span class="confirm-card__type confirm-card__type--${parsed.type}">${typeLabel}</span>
        <span class="confirm-card__amount">${formatCurrency(parsed.amount)}</span>
      </div>
      <div class="confirm-card__fields">
        <label>${t('chat.fieldAmount')}
          <input type="number" class="field" data-field="amount" value="${parsed.amount}" step="0.01" min="0">
        </label>
        <label>${t('chat.fieldCategory')}
          <select class="field" data-field="category">${catOptions}</select>
        </label>
        <label>${t('chat.fieldDate')}
          <input type="date" class="field" data-field="date" value="${todayStr()}">
        </label>
        <label>${t('chat.fieldNote')}
          <input type="text" class="field" data-field="description" value="${escHtml(rawText)}" placeholder="${t('chat.fieldNotePlaceholder')}">
        </label>
      </div>
      <div class="confirm-card__actions">
        <button class="btn btn--ghost btn--sm confirm-discard">${t('chat.discard')}</button>
        <button class="btn btn--primary btn--sm confirm-save">${t('chat.save')}</button>
      </div>
    </div>`;

  const bubble = appendBotBubble(html);

  bubble.querySelector('.confirm-save').addEventListener('click', async () => {
    await saveConfirmed(gatherConfirmFields(bubble, parsed.type), bubble);
  });
  bubble.querySelector('.confirm-discard').addEventListener('click', () => {
    bubble.remove();
    appendBotBubble(t('chat.discarded'));
  });
}

function gatherConfirmFields(bubble, type) {
  const get = (f) => bubble.querySelector(`[data-field="${f}"]`)?.value;
  return {
    type,
    amount:      parseFloat(get('amount')) || 0,
    category:    get('category') || 'Others',
    date:        get('date') || todayStr(),
    description: get('description') || '',
  };
}

async function saveConfirmed(data, bubble) {
  try {
    const tx = await addTransaction(data);
    bubble.remove();
    appendTransactionBubble(tx);
    showToast(t('toast.transactionSaved'));
    scrollToBottom();
  } catch {
    showToast(t('toast.saveFailed'), 'error');
  }
}

// ─── Transaction bubble ───────────────────────────────────────────────────────

function appendTransactionBubble(tx) {
  const typeClass = tx.type === 'income' ? 'tx--income' : tx.type === 'savings' ? 'tx--savings' : 'tx--expense';
  const sign      = tx.type === 'income' ? '+' : '-';

  const html = `
    <div class="tx-bubble ${typeClass}" data-tx-id="${tx.id}">
      <div class="tx-bubble__left">
        <span class="tx-bubble__icon">${categoryIcon(tx.category)}</span>
        <div class="tx-bubble__info">
          <span class="tx-bubble__desc">${escHtml(tx.description)}</span>
          <span class="tx-bubble__meta">${escHtml(tc(tx.category))} · ${formatDate(tx.date)}</span>
        </div>
      </div>
      <div class="tx-bubble__right">
        <span class="tx-bubble__amount">${sign}${formatCurrency(tx.amount)}</span>
        <div class="tx-bubble__actions">
          <button class="icon-btn" data-edit="${tx.id}" title="${t('transactions.colType')}">✏️</button>
          <button class="icon-btn" data-delete="${tx.id}" title="Delete">🗑️</button>
        </div>
      </div>
    </div>`;

  const container = document.getElementById('chat-messages');
  if (!container) return;
  container.insertAdjacentHTML('beforeend', html);

  const el = container.lastElementChild;
  el.querySelector(`[data-edit="${tx.id}"]`)?.addEventListener('click', () => openEditPanel(tx));
  el.querySelector(`[data-delete="${tx.id}"]`)?.addEventListener('click', () => confirmDelete(tx));
}

// ─── Edit panel ───────────────────────────────────────────────────────────────

async function openEditPanel(tx) {
  editingId = tx.id;
  const panel = document.getElementById('edit-panel');
  if (!panel) return;

  const cats = await getAllCategories();
  const opts = cats.filter((c) => c.type === tx.type)
    .map((c) => `<option value="${c.name}" ${c.name === tx.category ? 'selected' : ''}>${tc(c.name)}</option>`)
    .join('');

  panel.querySelector('#edit-amount').value      = tx.amount;
  panel.querySelector('#edit-category').innerHTML = opts;
  panel.querySelector('#edit-date').value         = tx.date;
  panel.querySelector('#edit-description').value  = tx.description;

  // Apply translated labels to edit panel
  const titleEl = panel.querySelector('.edit-panel__title');
  if (titleEl) titleEl.textContent = t('chat.editTitle');

  panel.classList.add('edit-panel--open');
}

function cancelEdit() {
  editingId = null;
  document.getElementById('edit-panel')?.classList.remove('edit-panel--open');
}

async function saveEdit() {
  if (!editingId) return;
  const panel = document.getElementById('edit-panel');
  const data  = {
    amount:      parseFloat(panel.querySelector('#edit-amount').value),
    category:    panel.querySelector('#edit-category').value,
    date:        panel.querySelector('#edit-date').value,
    description: panel.querySelector('#edit-description').value,
  };
  try {
    await updateTransaction(editingId, data);
    showToast(t('toast.transactionUpdated'));
    cancelEdit();
    document.querySelector(`[data-tx-id="${editingId}"]`)?.remove();
    appendTransactionBubble({ ...data, id: editingId });
    scrollToBottom();
  } catch {
    showToast(t('toast.updateFailed'), 'error');
  }
}

// ─── Delete ───────────────────────────────────────────────────────────────────

function confirmDelete(tx) {
  if (!confirm(`${t('confirm.deleteTransaction')}\n"${tx.description}" (${formatCurrency(tx.amount)})`)) return;
  doDelete(tx.id);
}

async function doDelete(id) {
  try {
    await deleteTransaction(id);
    document.querySelector(`[data-tx-id="${id}"]`)?.remove();
    showToast(t('toast.transactionDeleted'));
  } catch {
    showToast(t('toast.deleteFailed'), 'error');
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function appendUserBubble(text) {
  const c = document.getElementById('chat-messages');
  if (!c) return;
  c.insertAdjacentHTML('beforeend', `
    <div class="chat-bubble chat-bubble--user">
      <div class="chat-bubble__body">${escHtml(text)}</div>
    </div>`);
  scrollToBottom();
}

function appendBotBubble(html) {
  const c = document.getElementById('chat-messages');
  if (!c) return null;
  c.insertAdjacentHTML('beforeend', `
    <div class="chat-bubble chat-bubble--bot">
      <div class="chat-bubble__avatar">🐱</div>
      <div class="chat-bubble__body">${html}</div>
    </div>`);
  scrollToBottom();
  return c.lastElementChild;
}

function scrollToBottom() {
  const c = document.getElementById('chat-messages');
  if (c) c.scrollTop = c.scrollHeight;
}

function escHtml(str = '') {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function categoryIcon(cat = '') {
  const icons = {
    food: '🍔', transport: '🚗', bills: '📄', shopping: '🛍️',
    entertainment: '🎬', healthcare: '🏥', education: '📚', others: '📦',
    salary: '💼', freelance: '💻', business: '🏢', investments: '📈', 'other income': '💰',
    'emergency fund': '🛡️', vacation: '✈️', investment: '📊', retirement: '🌅',
    '餐饮': '🍔', '交通': '🚗', '账单': '📄', '购物': '🛍️', '娱乐': '🎬',
  };
  return icons[cat.toLowerCase()] || icons[cat] || '📦';
}
