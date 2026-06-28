/**
 * storage.js — Storage router
 *
 * When a Firebase user is signed in  → all reads/writes go to Firestore (firebase.js)
 * When not signed in                 → falls back to local IndexedDB
 *
 * Every function exported here has the same signature as before —
 * no other module needs to change.
 */

import { getCurrentUser } from './firebase.js';
import * as FB  from './firebase.js';
import * as IDB from './idb.js';

// ─── Route helper ─────────────────────────────────────────────────────────────

function store() {
  return getCurrentUser() ? FB : IDB;
}

// ─── DB init (IndexedDB only — Firestore needs no local init) ─────────────────

export async function initDB()        { return IDB.initDB(); }
export async function seedCategories(){ return store().seedCategories(); }

// ─── Transactions ─────────────────────────────────────────────────────────────

export async function addTransaction(data)          { return store().addTransaction(data); }
export async function updateTransaction(id, data)   { return store().updateTransaction(id, data); }
export async function deleteTransaction(id)         { return store().deleteTransaction(id); }
export async function getAllTransactions()           { return store().getAllTransactions(); }
export async function getTransactionsByDateRange(s, e) { return store().getTransactionsByDateRange(s, e); }

// ─── Categories ───────────────────────────────────────────────────────────────

export async function getAllCategories()         { return store().getAllCategories(); }
export async function addCategory(data)          { return store().addCategory(data); }
export async function updateCategory(id, data)   { return store().updateCategory(id, data); }
export async function deleteCategory(id)         { return store().deleteCategory(id); }

// ─── Recurring ────────────────────────────────────────────────────────────────

export async function addRecurring(data)        { return store().addRecurring(data); }
export async function updateRecurring(id, data) { return store().updateRecurring(id, data); }
export async function deleteRecurring(id)       { return store().deleteRecurring(id); }
export async function getAllRecurring()          { return store().getAllRecurring(); }

// ─── Meals ────────────────────────────────────────────────────────────────────

export async function addMeal(data)             { return store().addMeal(data); }
export async function getMealsByDate(dateStr)   { return store().getMealsByDate(dateStr); }
export async function getAllMeals()             { return store().getAllMeals(); }
export async function deleteMeal(id)            { return store().deleteMeal(id); }

// ─── Settings ─────────────────────────────────────────────────────────────────

export async function getSetting(key)           { return store().getSetting(key); }
export async function setSetting(key, value)    { return store().setSetting(key, value); }
export async function getAllSettings()          { return store().getAllSettings(); }

// ─── Savings Goals ────────────────────────────────────────────────────────────

export async function addSavingsGoal(data)          { return store().addSavingsGoal(data); }
export async function updateSavingsGoal(id, data)   { return store().updateSavingsGoal(id, data); }
export async function deleteSavingsGoal(id)         { return store().deleteSavingsGoal(id); }
export async function getAllSavingsGoals()           { return store().getAllSavingsGoals(); }

// ─── Category Budgets ─────────────────────────────────────────────────────────

export async function getAllCategoryBudgets()            { return store().getAllCategoryBudgets(); }
export async function getCategoryBudget(name)            { return store().getCategoryBudget(name); }
export async function setCategoryBudget(name, amount)    { return store().setCategoryBudget(name, amount); }
export async function updateCategoryBudget(id, data)     { return store().updateCategoryBudget(id, data); }
export async function deleteCategoryBudget(id)           { return store().deleteCategoryBudget(id); }

// ─── Export ───────────────────────────────────────────────────────────────────

export async function exportAllData() { return store().exportAllData(); }
export async function importAllData() { console.warn('importAllData: not implemented'); }
