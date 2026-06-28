/**
 * storage.js — IndexedDB abstraction layer
 * Designed to be swappable with a backend API in the future.
 * All data operations go through this module.
 */

const DB_NAME = 'BudgetAppDB';
const DB_VERSION = 2;

const STORES = {
  transactions: 'transactions',
  categories: 'categories',
  recurring: 'recurring',
  meals: 'meals',
  settings: 'settings',
  savingsGoals: 'savingsGoals',
  categoryBudgets: 'categoryBudgets',
};

let db = null;

// ─── Initialise ───────────────────────────────────────────────────────────────

export async function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const database = e.target.result;

      // Transactions store
      if (!database.objectStoreNames.contains(STORES.transactions)) {
        const txStore = database.createObjectStore(STORES.transactions, {
          keyPath: 'id',
          autoIncrement: true,
        });
        txStore.createIndex('date', 'date', { unique: false });
        txStore.createIndex('type', 'type', { unique: false });
        txStore.createIndex('category', 'category', { unique: false });
      }

      // Categories store
      if (!database.objectStoreNames.contains(STORES.categories)) {
        database.createObjectStore(STORES.categories, {
          keyPath: 'id',
          autoIncrement: true,
        });
      }

      // Recurring transactions store
      if (!database.objectStoreNames.contains(STORES.recurring)) {
        database.createObjectStore(STORES.recurring, {
          keyPath: 'id',
          autoIncrement: true,
        });
      }

      // Meals store
      if (!database.objectStoreNames.contains(STORES.meals)) {
        const mealStore = database.createObjectStore(STORES.meals, {
          keyPath: 'id',
          autoIncrement: true,
        });
        mealStore.createIndex('date', 'date', { unique: false });
      }

      // Settings store (key-value pairs)
      if (!database.objectStoreNames.contains(STORES.settings)) {
        database.createObjectStore(STORES.settings, { keyPath: 'key' });
      }

      // Savings goals store
      if (!database.objectStoreNames.contains(STORES.savingsGoals)) {
        database.createObjectStore(STORES.savingsGoals, {
          keyPath: 'id',
          autoIncrement: true,
        });
      }

      // Category budgets store (new — v2)
      if (!database.objectStoreNames.contains(STORES.categoryBudgets)) {
        const budgetStore = database.createObjectStore(STORES.categoryBudgets, {
          keyPath: 'id',
          autoIncrement: true,
        });
        budgetStore.createIndex('categoryName', 'categoryName', { unique: true });
      }
    };

    request.onsuccess = (e) => {
      db = e.target.result;
      resolve(db);
    };

    request.onerror = () => reject(request.error);
  });
}

// ─── Generic helpers ──────────────────────────────────────────────────────────

function getStore(storeName, mode = 'readonly') {
  const tx = db.transaction(storeName, mode);
  return tx.objectStore(storeName);
}

function promisify(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ─── Transactions ─────────────────────────────────────────────────────────────

export async function addTransaction(data) {
  const store = getStore(STORES.transactions, 'readwrite');
  const id = await promisify(store.add({ ...data, createdAt: Date.now() }));
  return { ...data, id };
}

export async function updateTransaction(id, data) {
  const store = getStore(STORES.transactions, 'readwrite');
  const existing = await promisify(store.get(id));
  if (!existing) throw new Error('Transaction not found');
  const updated = { ...existing, ...data, updatedAt: Date.now() };
  await promisify(store.put(updated));
  return updated;
}

export async function deleteTransaction(id) {
  const store = getStore(STORES.transactions, 'readwrite');
  await promisify(store.delete(id));
}

export async function getAllTransactions() {
  const store = getStore(STORES.transactions);
  return promisify(store.getAll());
}

export async function getTransactionsByDateRange(startDate, endDate) {
  const all = await getAllTransactions();
  return all.filter((t) => {
    const d = new Date(t.date);
    return d >= new Date(startDate) && d <= new Date(endDate);
  });
}

// ─── Categories ───────────────────────────────────────────────────────────────

const DEFAULT_CATEGORIES = [
  // Expense
  { name: 'Food', type: 'expense', icon: '🍔', color: '#FF6B6B', isDefault: true },
  { name: 'Transport', type: 'expense', icon: '🚗', color: '#4ECDC4', isDefault: true },
  { name: 'Bills', type: 'expense', icon: '📄', color: '#45B7D1', isDefault: true },
  { name: 'Shopping', type: 'expense', icon: '🛍️', color: '#96CEB4', isDefault: true },
  { name: 'Entertainment', type: 'expense', icon: '🎬', color: '#FFEAA7', isDefault: true },
  { name: 'Healthcare', type: 'expense', icon: '🏥', color: '#DDA0DD', isDefault: true },
  { name: 'Education', type: 'expense', icon: '📚', color: '#98D8C8', isDefault: true },
  { name: 'Others', type: 'expense', icon: '📦', color: '#B0B0B0', isDefault: true },
  // Income
  { name: 'Salary', type: 'income', icon: '💼', color: '#6BCB77', isDefault: true },
  { name: 'Freelance', type: 'income', icon: '💻', color: '#4D96FF', isDefault: true },
  { name: 'Business', type: 'income', icon: '🏢', color: '#FF6B6B', isDefault: true },
  { name: 'Investments', type: 'income', icon: '📈', color: '#FFD93D', isDefault: true },
  { name: 'Other Income', type: 'income', icon: '💰', color: '#C9B1FF', isDefault: true },
  // Savings
  { name: 'Emergency Fund', type: 'savings', icon: '🛡️', color: '#FF9F43', isDefault: true },
  { name: 'Vacation', type: 'savings', icon: '✈️', color: '#54A0FF', isDefault: true },
  { name: 'Investment', type: 'savings', icon: '📊', color: '#5F27CD', isDefault: true },
  { name: 'Retirement', type: 'savings', icon: '🌅', color: '#EE5A24', isDefault: true },
];

export async function seedCategories() {
  const existing = await getAllCategories();
  if (existing.length > 0) return;
  const store = getStore(STORES.categories, 'readwrite');
  for (const cat of DEFAULT_CATEGORIES) {
    await promisify(store.add(cat));
  }
}

export async function getAllCategories() {
  const store = getStore(STORES.categories);
  return promisify(store.getAll());
}

export async function addCategory(data) {
  const store = getStore(STORES.categories, 'readwrite');
  const id = await promisify(store.add({ ...data, isDefault: false }));
  return { ...data, id, isDefault: false };
}

export async function updateCategory(id, data) {
  const store = getStore(STORES.categories, 'readwrite');
  const existing = await promisify(store.get(id));
  if (!existing) throw new Error('Category not found');
  const updated = { ...existing, ...data };
  await promisify(store.put(updated));
  return updated;
}

export async function deleteCategory(id) {
  const store = getStore(STORES.categories, 'readwrite');
  await promisify(store.delete(id));
}

// ─── Recurring Transactions ───────────────────────────────────────────────────

export async function addRecurring(data) {
  const store = getStore(STORES.recurring, 'readwrite');
  const id = await promisify(store.add({ ...data, createdAt: Date.now() }));
  return { ...data, id };
}

export async function updateRecurring(id, data) {
  const store = getStore(STORES.recurring, 'readwrite');
  const existing = await promisify(store.get(id));
  if (!existing) throw new Error('Recurring not found');
  const updated = { ...existing, ...data };
  await promisify(store.put(updated));
  return updated;
}

export async function deleteRecurring(id) {
  const store = getStore(STORES.recurring, 'readwrite');
  await promisify(store.delete(id));
}

export async function getAllRecurring() {
  const store = getStore(STORES.recurring);
  return promisify(store.getAll());
}

// ─── Meals ────────────────────────────────────────────────────────────────────

export async function addMeal(data) {
  const store = getStore(STORES.meals, 'readwrite');
  const id = await promisify(store.add({ ...data, createdAt: Date.now() }));
  return { ...data, id };
}

export async function getMealsByDate(dateStr) {
  const all = await promisify(getStore(STORES.meals).getAll());
  return all.filter((m) => m.date === dateStr);
}

export async function getAllMeals() {
  return promisify(getStore(STORES.meals).getAll());
}

export async function deleteMeal(id) {
  const store = getStore(STORES.meals, 'readwrite');
  await promisify(store.delete(id));
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export async function getSetting(key) {
  const store = getStore(STORES.settings);
  const result = await promisify(store.get(key));
  return result ? result.value : null;
}

export async function setSetting(key, value) {
  const store = getStore(STORES.settings, 'readwrite');
  await promisify(store.put({ key, value }));
}

export async function getAllSettings() {
  const store = getStore(STORES.settings);
  const all = await promisify(store.getAll());
  return Object.fromEntries(all.map((s) => [s.key, s.value]));
}

// ─── Savings Goals ────────────────────────────────────────────────────────────

export async function addSavingsGoal(data) {
  const store = getStore(STORES.savingsGoals, 'readwrite');
  const id = await promisify(store.add({ ...data, createdAt: Date.now() }));
  return { ...data, id };
}

export async function updateSavingsGoal(id, data) {
  const store = getStore(STORES.savingsGoals, 'readwrite');
  const existing = await promisify(store.get(id));
  const updated = { ...existing, ...data };
  await promisify(store.put(updated));
  return updated;
}

export async function deleteSavingsGoal(id) {
  await promisify(getStore(STORES.savingsGoals, 'readwrite').delete(id));
}

export async function getAllSavingsGoals() {
  return promisify(getStore(STORES.savingsGoals).getAll());
}

// ─── Category Budgets ─────────────────────────────────────────────────────────

export async function getAllCategoryBudgets() {
  return promisify(getStore(STORES.categoryBudgets).getAll());
}

export async function getCategoryBudget(categoryName) {
  const all = await getAllCategoryBudgets();
  return all.find((b) => b.categoryName === categoryName) || null;
}

export async function setCategoryBudget(categoryName, amount) {
  const store = getStore(STORES.categoryBudgets, 'readwrite');
  const existing = await getCategoryBudget(categoryName);
  if (existing) {
    const updated = { ...existing, amount, updatedAt: Date.now() };
    await promisify(store.put(updated));
    return updated;
  }
  const data = { categoryName, amount, enabled: true, createdAt: Date.now() };
  const id = await promisify(store.add(data));
  return { ...data, id };
}

export async function updateCategoryBudget(id, data) {
  const store = getStore(STORES.categoryBudgets, 'readwrite');
  const existing = await promisify(store.get(id));
  if (!existing) throw new Error('Budget not found');
  const updated = { ...existing, ...data, updatedAt: Date.now() };
  await promisify(store.put(updated));
  return updated;
}

export async function deleteCategoryBudget(id) {
  await promisify(getStore(STORES.categoryBudgets, 'readwrite').delete(id));
}

// ─── Export / Import (future backend swap point) ──────────────────────────────

export async function exportAllData() {
  const [transactions, categories, recurring, meals, savingsGoals, settings] =
    await Promise.all([
      getAllTransactions(),
      getAllCategories(),
      getAllRecurring(),
      getAllMeals(),
      getAllSavingsGoals(),
      getAllSettings(),
    ]);
  return { transactions, categories, recurring, meals, savingsGoals, settings, exportedAt: Date.now() };
}

export async function importAllData(data) {
  // Placeholder — in a real app this would do a full DB reset then re-insert
  console.warn('importAllData: not yet implemented');
}
