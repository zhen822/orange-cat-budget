/**
 * calculator.js — Native calculator-style transaction entry
 * Replaces the chat interface with a clean, mobile-friendly
 * numpad that lets users add transactions instantly.
 */

import { addTransaction, getAllTransactions, deleteTransaction, getAllCategories } from './storage.js';
import { formatCurrency, formatDate, todayStr, showToast, t, tc } from './app.js';

// ─── State ────────────────────────────────────────────────────────────────────
let _display   = '0';       // current number shown
let _type      = 'expense'; // expense | income | savings
let _category  = '';
let _categories = [];
let _historyTx  = [];

// ─── Entry Point ──────────────────────────────────────────────────────────────

export async function initCalculator() {
  _categories = await getAllCategories();
  _historyTx  = (await getAllTransactions())
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .slice(0, 20);

  renderTypeBar();
  renderCategoryPills();
  renderHistory();
  setupNumpad();
  setupDateField();
  updateDisplay();

  // Re-render on language change
  document.addEventListener('langchange', () => {
    renderTypeBar();
    renderCategoryPills();
    renderHistory();
    updateDisplay();
  });
}

// ─── Type switcher ────────────────────────────────────────────────────────────

function renderTypeBar() {
  const bar = document.getElementById('calc-type-bar');
  if (!bar) return;

  const types = [
    { key: 'expense', label: t('calc.expense'),  icon: '💸' },
    { key: 'income',  label: t('calc.income'),   icon: '💰' },
    { key: 'savings', label: t('calc.savings'),  icon: '🏦' },
  ];

  bar.innerHTML = types.map(({ key, label, icon }) => `
    <button class="calc-type-btn ${_type === key ? 'calc-type-btn--active calc-type-btn--' + key : ''}"
      data-type="${key}">
      <span class="calc-type-btn__icon">${icon}</span>
      <span class="calc-type-btn__label">${label}</span>
    </button>`).join('');

  bar.querySelectorAll('[data-type]').forEach(btn => {
    btn.addEventListener('click', () => {
      _type = btn.dataset.type;
      _category = '';
      renderTypeBar();
      renderCategoryPills();
    });
  });
}

// ─── Category pills ───────────────────────────────────────────────────────────

function renderCategoryPills() {
  const wrap = document.getElementById('calc-categories');
  if (!wrap) return;

  const filtered = _categories.filter(c => c.type === _type);

  // Auto-select first if none selected
  if (!_category && filtered.length > 0) _category = filtered[0].name;

  wrap.innerHTML = filtered.map(c => `
    <button class="calc-cat-pill ${c.name === _category ? 'calc-cat-pill--active' : ''}"
      data-cat="${escHtml(c.name)}">
      <span>${c.icon || catIcon(c.name)}</span>
      <span>${escHtml(tc(c.name))}</span>
    </button>`).join('');

  wrap.querySelectorAll('[data-cat]').forEach(btn => {
    btn.addEventListener('click', () => {
      _category = btn.dataset.cat;
      wrap.querySelectorAll('.calc-cat-pill').forEach(b => b.classList.remove('calc-cat-pill--active'));
      btn.classList.add('calc-cat-pill--active');
    });
  });
}

// ─── Numpad ───────────────────────────────────────────────────────────────────

function setupNumpad() {
  const pad = document.getElementById('calc-numpad');
  if (!pad) return;

  const keys = [
    '7','8','9',
    '4','5','6',
    '1','2','3',
    '.','0','⌫',
  ];

  pad.innerHTML = keys.map(k => `
    <button class="calc-key ${k === '⌫' ? 'calc-key--del' : ''}" data-key="${k}">
      ${k}
    </button>`).join('');

  // Clear & Save buttons are in HTML — just wire the numpad keys
  pad.querySelectorAll('[data-key]').forEach(btn => {
    btn.addEventListener('click', () => handleKey(btn.dataset.key));
  });

  document.getElementById('calc-clear')?.addEventListener('click', () => {
    _display = '0';
    updateDisplay();
  });

  document.getElementById('calc-save')?.addEventListener('click', saveTransaction);
}

function handleKey(key) {
  if (key === '⌫') {
    _display = _display.length > 1 ? _display.slice(0, -1) : '0';
  } else if (key === '.') {
    if (!_display.includes('.')) _display += '.';
  } else {
    if (_display === '0') _display = key;
    else if (_display.length < 10) _display += key;
  }
  updateDisplay();
}

function updateDisplay() {
  const el = document.getElementById('calc-display');
  if (!el) return;

  const num = parseFloat(_display) || 0;
  const sym = document.getElementById('calc-display')?.dataset.sym || 'RM';

  // Show formatted if no decimal input in progress, raw otherwise
  const showRaw = _display.endsWith('.') || (_display.includes('.') && _display.split('.')[1].length <= 2);
  el.textContent = showRaw
    ? `${sym} ${_display}`
    : `${sym} ${num.toLocaleString('en-MY', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

  // Colour by type
  el.className = `calc-display calc-display--${_type}`;
}

// ─── Save ─────────────────────────────────────────────────────────────────────

async function saveTransaction() {
  const amount = parseFloat(_display);
  if (!amount || amount <= 0) {
    showToast(t('calc.errorAmount'), 'error');
    return;
  }

  const note     = document.getElementById('calc-note')?.value.trim() || '';
  const date     = document.getElementById('calc-date')?.value || todayStr();
  const category = _category || 'Others';

  const tx = await addTransaction({
    type:        _type,
    amount,
    category,
    date,
    description: note || tc(category),
  });

  showToast(t('calc.saved'));

  // Reset display
  _display = '0';
  updateDisplay();
  if (document.getElementById('calc-note')) document.getElementById('calc-note').value = '';

  // Prepend to history
  _historyTx.unshift(tx);
  if (_historyTx.length > 20) _historyTx.pop();
  renderHistory();
}

// ─── History list ─────────────────────────────────────────────────────────────

function renderHistory() {
  const el = document.getElementById('calc-history');
  if (!el) return;

  if (_historyTx.length === 0) {
    el.innerHTML = `<p class="muted" style="text-align:center;padding:var(--space-lg)">${t('calc.noHistory')}</p>`;
    return;
  }

  el.innerHTML = _historyTx.map(tx => {
    const sign  = tx.type === 'income' ? '+' : '-';
    const cls   = `tx--${tx.type}`;
    return `
      <div class="calc-hist-row ${cls}" data-id="${tx.id}">
        <span class="calc-hist-icon">${catIcon(tx.category)}</span>
        <div class="calc-hist-info">
          <span class="calc-hist-desc">${escHtml(tx.description || tc(tx.category))}</span>
          <span class="calc-hist-meta">${escHtml(tc(tx.category))} · ${formatDate(tx.date)}</span>
        </div>
        <div class="calc-hist-right">
          <span class="calc-hist-amount">${sign}${formatCurrency(tx.amount)}</span>
          <button class="icon-btn calc-hist-del" data-del="${tx.id}">🗑️</button>
        </div>
      </div>`;
  }).join('');

  el.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.del;
      await deleteTransaction(id);
      _historyTx = _historyTx.filter(tx => String(tx.id) !== String(id));
      renderHistory();
    });
  });
}

// ─── Date field ───────────────────────────────────────────────────────────────

function setupDateField() {
  const dateEl = document.getElementById('calc-date');
  if (dateEl) dateEl.value = todayStr();
}

// ─── Utils ────────────────────────────────────────────────────────────────────

function catIcon(name = '') {
  const m = {
    food:'🍔', transport:'🚗', bills:'📄', shopping:'🛍️',
    entertainment:'🎬', healthcare:'🏥', education:'📚', others:'📦',
    salary:'💼', freelance:'💻', business:'🏢', investments:'📈',
    'other income':'💰', 'emergency fund':'🛡️', vacation:'✈️',
    investment:'📊', retirement:'🌅',
    '餐饮':'🍔','交通':'🚗','账单':'📄','购物':'🛍️','娱乐':'🎬',
  };
  return m[name.toLowerCase()] || m[name] || '📦';
}

function escHtml(s = '') {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
