/**
 * firebase.js — Firebase + Firestore data layer
 *
 * Every function here has the EXACT same signature as the original storage.js
 * functions. The storage.js router calls these when a user is signed in.
 *
 * Firestore structure per user:
 *   users/{uid}/transactions/{docId}
 *   users/{uid}/categories/{docId}
 *   users/{uid}/recurring/{docId}
 *   users/{uid}/meals/{docId}          ← Base64 photos stored inline
 *   users/{uid}/settings/{key}
 *   users/{uid}/savingsGoals/{docId}
 *   users/{uid}/categoryBudgets/{docId}
 *
 * ────────────────────────────────────────────────────────────────────────────
 * SETUP — paste your Firebase config into FIREBASE_CONFIG below.
 * Get it from: Firebase Console → Project Settings → Your Apps → Config
 * ────────────────────────────────────────────────────────────────────────────
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// ─── YOUR FIREBASE CONFIG ─────────────────────────────────────────────────────
// Replace this object with your own config from Firebase Console
const FIREBASE_CONFIG = {
  apiKey:            "PASTE_YOUR_API_KEY",
  authDomain:        "PASTE_YOUR_AUTH_DOMAIN",
  projectId:         "PASTE_YOUR_PROJECT_ID",
  storageBucket:     "PASTE_YOUR_STORAGE_BUCKET",
  messagingSenderId: "PASTE_YOUR_MESSAGING_SENDER_ID",
  appId:             "PASTE_YOUR_APP_ID",
};
// ─────────────────────────────────────────────────────────────────────────────

const app  = initializeApp(FIREBASE_CONFIG);
const auth = getAuth(app);
const db   = getFirestore(app);

// ─── Auth state ───────────────────────────────────────────────────────────────

export let currentUser = null;

export function onAuthReady(callback) {
  return onAuthStateChanged(auth, (user) => {
    currentUser = user;
    callback(user);
  });
}

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const result = await signInWithPopup(auth, provider);
  currentUser = result.user;
  return result.user;
}

export async function signOutUser() {
  await signOut(auth);
  currentUser = null;
}

export function getCurrentUser() {
  return auth.currentUser;
}

// ─── Firestore path helpers ───────────────────────────────────────────────────

function userCol(colName) {
  if (!currentUser) throw new Error('Not signed in');
  return collection(db, 'users', currentUser.uid, colName);
}

function userDoc(colName, docId) {
  if (!currentUser) throw new Error('Not signed in');
  return doc(db, 'users', currentUser.uid, colName, docId);
}

/** Convert Firestore doc snapshot → plain object with id field */
function snap(docSnap) {
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() };
}

/** Convert QuerySnapshot → array of plain objects */
function snapAll(querySnap) {
  return querySnap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ─── Transactions ─────────────────────────────────────────────────────────────

export async function addTransaction(data) {
  const ref = await addDoc(userCol('transactions'), {
    ...data,
    createdAt: Date.now(),
  });
  return { ...data, id: ref.id };
}

export async function updateTransaction(id, data) {
  await updateDoc(userDoc('transactions', id), { ...data, updatedAt: Date.now() });
  return { ...data, id };
}

export async function deleteTransaction(id) {
  await deleteDoc(userDoc('transactions', id));
}

export async function getAllTransactions() {
  const snap_ = await getDocs(userCol('transactions'));
  return snapAll(snap_);
}

export async function getTransactionsByDateRange(startDate, endDate) {
  const all = await getAllTransactions();
  return all.filter((t) => t.date >= startDate && t.date <= endDate);
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
  for (const cat of DEFAULT_CATEGORIES) {
    await addDoc(userCol('categories'), cat);
  }
}

export async function getAllCategories() {
  const snap_ = await getDocs(userCol('categories'));
  return snapAll(snap_);
}

export async function addCategory(data) {
  const ref = await addDoc(userCol('categories'), { ...data, isDefault: false });
  return { ...data, id: ref.id, isDefault: false };
}

export async function updateCategory(id, data) {
  await updateDoc(userDoc('categories', id), data);
  return { ...data, id };
}

export async function deleteCategory(id) {
  await deleteDoc(userDoc('categories', id));
}

// ─── Recurring Transactions ───────────────────────────────────────────────────

export async function addRecurring(data) {
  const ref = await addDoc(userCol('recurring'), { ...data, createdAt: Date.now() });
  return { ...data, id: ref.id };
}

export async function updateRecurring(id, data) {
  await updateDoc(userDoc('recurring', id), data);
  return { ...data, id };
}

export async function deleteRecurring(id) {
  await deleteDoc(userDoc('recurring', id));
}

export async function getAllRecurring() {
  const snap_ = await getDocs(userCol('recurring'));
  return snapAll(snap_);
}

// ─── Meals ────────────────────────────────────────────────────────────────────

export async function addMeal(data) {
  const ref = await addDoc(userCol('meals'), { ...data, createdAt: Date.now() });
  return { ...data, id: ref.id };
}

export async function getMealsByDate(dateStr) {
  const all = await getAllMeals();
  return all.filter((m) => m.date === dateStr);
}

export async function getAllMeals() {
  const snap_ = await getDocs(userCol('meals'));
  return snapAll(snap_);
}

export async function deleteMeal(id) {
  await deleteDoc(userDoc('meals', id));
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export async function getSetting(key) {
  const d = await getDoc(userDoc('settings', key));
  return d.exists() ? d.data().value : null;
}

export async function setSetting(key, value) {
  await setDoc(userDoc('settings', key), { key, value });
}

export async function getAllSettings() {
  const snap_ = await getDocs(userCol('settings'));
  const result = {};
  snap_.docs.forEach((d) => { result[d.id] = d.data().value; });
  return result;
}

// ─── Savings Goals ────────────────────────────────────────────────────────────

export async function addSavingsGoal(data) {
  const ref = await addDoc(userCol('savingsGoals'), { ...data, createdAt: Date.now() });
  return { ...data, id: ref.id };
}

export async function updateSavingsGoal(id, data) {
  await updateDoc(userDoc('savingsGoals', id), data);
  return { ...data, id };
}

export async function deleteSavingsGoal(id) {
  await deleteDoc(userDoc('savingsGoals', id));
}

export async function getAllSavingsGoals() {
  const snap_ = await getDocs(userCol('savingsGoals'));
  return snapAll(snap_);
}

// ─── Category Budgets ─────────────────────────────────────────────────────────

export async function getAllCategoryBudgets() {
  const snap_ = await getDocs(userCol('categoryBudgets'));
  return snapAll(snap_);
}

export async function getCategoryBudget(categoryName) {
  const all = await getAllCategoryBudgets();
  return all.find((b) => b.categoryName === categoryName) || null;
}

export async function setCategoryBudget(categoryName, amount) {
  const existing = await getCategoryBudget(categoryName);
  if (existing) {
    await updateDoc(userDoc('categoryBudgets', existing.id), { amount, updatedAt: Date.now() });
    return { ...existing, amount };
  }
  const data = { categoryName, amount, enabled: true, createdAt: Date.now() };
  const ref  = await addDoc(userCol('categoryBudgets'), data);
  return { ...data, id: ref.id };
}

export async function updateCategoryBudget(id, data) {
  await updateDoc(userDoc('categoryBudgets', id), { ...data, updatedAt: Date.now() });
  return { ...data, id };
}

export async function deleteCategoryBudget(id) {
  await deleteDoc(userDoc('categoryBudgets', id));
}

// ─── Export all data ──────────────────────────────────────────────────────────

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
