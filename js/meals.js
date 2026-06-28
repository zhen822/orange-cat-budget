/**
 * meals.js — Meal text-only tracking (photo upload removed)
 * Records meal descriptions by date. No camera, no file upload.
 */

import { addMeal, getAllMeals, deleteMeal } from './storage.js';
import { todayStr, showToast, formatDate, t } from './app.js';

let meals = [];

export async function initMeals() {
  meals = await getAllMeals();
  renderMealsGallery();
  setupMealControls();
  document.addEventListener('langchange', () => renderMealsGallery());
}

function setupMealControls() {
  const saveBtn   = document.getElementById('meal-save-btn');
  const dateInput = document.getElementById('meal-date');
  const descInput = document.getElementById('meal-desc');

  if (dateInput) dateInput.value = todayStr();

  saveBtn?.addEventListener('click', async () => {
    const description = descInput?.value.trim();
    const date        = dateInput?.value || todayStr();
    if (!description) {
      showToast(t('meals.descRequired') || 'Please enter a description.', 'error');
      return;
    }
    const meal = await addMeal({ description, date, photoDataUrl: null });
    meals.push(meal);
    renderMealsGallery();
    showToast(t('toast.mealSaved'));
    if (descInput) descInput.value = '';
  });
}

function renderMealsGallery() {
  const gallery = document.getElementById('meals-gallery');
  if (!gallery) return;

  if (meals.length === 0) {
    gallery.innerHTML = `<div class="empty-state">
      <span class="empty-state__icon">🍽️</span>
      <p>${t('meals.empty')}</p>
    </div>`;
    return;
  }

  const byDate = {};
  meals.forEach((m) => {
    if (!byDate[m.date]) byDate[m.date] = [];
    byDate[m.date].push(m);
  });

  gallery.innerHTML = Object.keys(byDate).sort((a, b) => b.localeCompare(a)).map((date) => `
    <div class="meal-group">
      <h4 class="meal-group__date">${formatDate(date)}</h4>
      <div class="meal-list">
        ${byDate[date].map(mealRow).join('')}
      </div>
    </div>`).join('');

  gallery.querySelectorAll('[data-delete-meal]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.deleteMeal;
      await deleteMeal(id);
      meals = meals.filter((m) => String(m.id) !== String(id));
      renderMealsGallery();
      showToast(t('toast.mealDeleted'));
    });
  });
}

function mealRow(m) {
  return `
    <div class="meal-row">
      <span class="meal-row__icon">🍽️</span>
      <span class="meal-row__desc">${escHtml(m.description)}</span>
      <button class="icon-btn" data-delete-meal="${m.id}" title="Delete">🗑️</button>
    </div>`;
}

function escHtml(s = '') {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
