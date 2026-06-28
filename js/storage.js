/**
 * storage.js — IndexedDB storage layer
 * All app data stored locally in the browser.
 * No server, no account required.
 */

const DB_NAME    = 'BudgetAppDB';
const DB_VERSION = 2;

const STORES = {
  transactions:    'transactions',
  categories:      'categories',
  recurring:       'recurring',
  settings:        'settings',
  savingsGoals:    'savingsGoals',
  categoryBudgets: 'categoryBudgets',
};

let db = null;

// ─── Init ─────────────────────────────────────────────────────────────────────

export async function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const database = e.target.result;

      if (!database.objectStoreNames.contains(STORES.transactions)) {
        const s = database.createObjectStore(STORES.transactions, { keyPath: 'id', autoIncrement: true });
        s.createIndex('date', 'date', { unique: false });
        s.createIndex('type', 'type', { unique: false });
        s.createIndex('category', 'category', { unique: false });
      }
      if (!database.objectStoreNames.contains(STORES.categories))
        database.createObjectStore(STORES.categories, { keyPath: 'id', autoIncrement: true });
      if (!database.objectStoreNames.contains(STORES.recurring))
        database.createObjectStore(STORES.recurring, { keyPath: 'id', autoIncrement: true });
      if (!database.objectStoreNames.contains(STORES.settings))
        database.createObjectStore(STORES.settings, { keyPath: 'key' });
      if (!database.objectStoreNames.contains(STORES.savingsGoals))
        database.createObjectStore(STORES.savingsGoals, { keyPath: 'id', autoIncrement: true });
      if (!database.objectStoreNames.contains(STORES.categoryBudgets)) {
        const s = database.createObjectStore(STORES.categoryBudgets, { keyPath: 'id', autoIncrement: true });
        s.createIndex('categoryName', 'categoryName', { unique: true });
      }
    };

    request.onsuccess = (e) => { db = e.target.result; resolve(db); };
    request.onerror   = ()  => reject(request.error);
  });
}

function getStore(name, mode = 'readonly') {
  return db.transaction(name, mode).objectStore(name);
}

function p(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

// ─── Transactions ─────────────────────────────────────────────────────────────

export async function addTransaction(data) {
  const id = await p(getStore(STORES.transactions, 'readwrite').add({ ...data, createdAt: Date.now() }));
  return { ...data, id };
}
export async function updateTransaction(id, data) {
  const s   = getStore(STORES.transactions, 'readwrite');
  const old = await p(s.get(id));
  if (!old) throw new Error('Transaction not found');
  const updated = { ...old, ...data, updatedAt: Date.now() };
  await p(s.put(updated));
  return updated;
}
export async function deleteTransaction(id) {
  await p(getStore(STORES.transactions, 'readwrite').delete(id));
}
export async function getAllTransactions() {
  return p(getStore(STORES.transactions).getAll());
}
export async function getTransactionsByDateRange(start, end) {
  const all = await getAllTransactions();
  return all.filter((t) => t.date >= start && t.date <= end);
}

// ─── Categories ───────────────────────────────────────────────────────────────

const DEFAULT_CATEGORIES = [
  { name: 'Food',          type: 'expense', icon: '🍔', color: '#FF6B6B', isDefault: true },
  { name: 'Transport',     type: 'expense', icon: '🚗', color: '#4ECDC4', isDefault: true },
  { name: 'Bills',         type: 'expense', icon: '📄', color: '#45B7D1', isDefault: true },
  { name: 'Shopping',      type: 'expense', icon: '🛍️', color: '#96CEB4', isDefault: true },
  { name: 'Entertainment', type: 'expense', icon: '🎬', color: '#FFEAA7', isDefault: true },
  { name: 'Healthcare',    type: 'expense', icon: '🏥', color: '#DDA0DD', isDefault: true },
  { name: 'Education',     type: 'expense', icon: '📚', color: '#98D8C8', isDefault: true },
  { name: 'Others',        type: 'expense', icon: '📦', color: '#B0B0B0', isDefault: true },
  { name: 'Salary',        type: 'income',  icon: '💼', color: '#6BCB77', isDefault: true },
  { name: 'Freelance',     type: 'income',  icon: '💻', color: '#4D96FF', isDefault: true },
  { name: 'Business',      type: 'income',  icon: '🏢', color: '#FF6B6B', isDefault: true },
  { name: 'Investments',   type: 'income',  icon: '📈', color: '#FFD93D', isDefault: true },
  { name: 'Other Income',  type: 'income',  icon: '💰', color: '#C9B1FF', isDefault: true },
  { name: 'Emergency Fund',type: 'savings', icon: '🛡️', color: '#FF9F43', isDefault: true },
  { name: 'Vacation',      type: 'savings', icon: '✈️', color: '#54A0FF', isDefault: true },
  { name: 'Investment',    type: 'savings', icon: '📊', color: '#5F27CD', isDefault: true },
  { name: 'Retirement',    type: 'savings', icon: '🌅', color: '#EE5A24', isDefault: true },
];

export async function seedCategories() {
  const existing = await getAllCategories();
  if (existing.length > 0) return;
  const s = getStore(STORES.categories, 'readwrite');
  for (const cat of DEFAULT_CATEGORIES) await p(s.add(cat));
}
export async function getAllCategories() {
  return p(getStore(STORES.categories).getAll());
}
export async function addCategory(data) {
  const id = await p(getStore(STORES.categories, 'readwrite').add({ ...data, isDefault: false }));
  return { ...data, id, isDefault: false };
}
export async function updateCategory(id, data) {
  const s   = getStore(STORES.categories, 'readwrite');
  const old = await p(s.get(id));
  const upd = { ...old, ...data };
  await p(s.put(upd));
  return upd;
}
export async function deleteCategory(id) {
  await p(getStore(STORES.categories, 'readwrite').delete(id));
}

// ─── Recurring ────────────────────────────────────────────────────────────────

export async function addRecurring(data) {
  const id = await p(getStore(STORES.recurring, 'readwrite').add({ ...data, createdAt: Date.now() }));
  return { ...data, id };
}
export async function updateRecurring(id, data) {
  const s   = getStore(STORES.recurring, 'readwrite');
  const old = await p(s.get(id));
  const upd = { ...old, ...data };
  await p(s.put(upd));
  return upd;
}
export async function deleteRecurring(id) {
  await p(getStore(STORES.recurring, 'readwrite').delete(id));
}
export async function getAllRecurring() {
  return p(getStore(STORES.recurring).getAll());
}


// ─── Settings ─────────────────────────────────────────────────────────────────

export async function getSetting(key) {
  const r = await p(getStore(STORES.settings).get(key));
  return r ? r.value : null;
}
export async function setSetting(key, value) {
  await p(getStore(STORES.settings, 'readwrite').put({ key, value }));
}
export async function getAllSettings() {
  const all = await p(getStore(STORES.settings).getAll());
  return Object.fromEntries(all.map((s) => [s.key, s.value]));
}

// ─── Savings Goals ────────────────────────────────────────────────────────────

export async function addSavingsGoal(data) {
  const id = await p(getStore(STORES.savingsGoals, 'readwrite').add({ ...data, createdAt: Date.now() }));
  return { ...data, id };
}
export async function updateSavingsGoal(id, data) {
  const s   = getStore(STORES.savingsGoals, 'readwrite');
  const old = await p(s.get(id));
  const upd = { ...old, ...data };
  await p(s.put(upd));
  return upd;
}
export async function deleteSavingsGoal(id) {
  await p(getStore(STORES.savingsGoals, 'readwrite').delete(id));
}
export async function getAllSavingsGoals() {
  return p(getStore(STORES.savingsGoals).getAll());
}

// ─── Category Budgets ─────────────────────────────────────────────────────────

export async function getAllCategoryBudgets() {
  return p(getStore(STORES.categoryBudgets).getAll());
}
export async function getCategoryBudget(categoryName) {
  const all = await getAllCategoryBudgets();
  return all.find((b) => b.categoryName === categoryName) || null;
}
export async function setCategoryBudget(categoryName, amount) {
  const s        = getStore(STORES.categoryBudgets, 'readwrite');
  const existing = await getCategoryBudget(categoryName);
  if (existing) {
    const upd = { ...existing, amount, updatedAt: Date.now() };
    await p(s.put(upd));
    return upd;
  }
  const data = { categoryName, amount, enabled: true, createdAt: Date.now() };
  const id   = await p(s.add(data));
  return { ...data, id };
}
export async function updateCategoryBudget(id, data) {
  const s   = getStore(STORES.categoryBudgets, 'readwrite');
  const old = await p(s.get(id));
  if (!old) throw new Error('Budget not found');
  const upd = { ...old, ...data, updatedAt: Date.now() };
  await p(s.put(upd));
  return upd;
}
export async function deleteCategoryBudget(id) {
  await p(getStore(STORES.categoryBudgets, 'readwrite').delete(id));
}

// ─── Export ───────────────────────────────────────────────────────────────────

export async function exportAllData() {
  const [transactions, categories, recurring, savingsGoals, settings] = await Promise.all([
    getAllTransactions(), getAllCategories(), getAllRecurring(),
    getAllSavingsGoals(), getAllSettings(),
  ]);
  return { transactions, categories, recurring, savingsGoals, settings, exportedAt: Date.now() };
};
}
