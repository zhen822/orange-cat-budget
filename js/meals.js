/**
 * meals.js — Meal photo tracking
 * All UI strings via t() from app.js.
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
  const cameraBtn = document.getElementById('meal-camera-btn');
  const uploadBtn = document.getElementById('meal-upload-btn');
  const fileInput = document.getElementById('meal-file-input');
  const saveBtn   = document.getElementById('meal-save-btn');
  const preview   = document.getElementById('meal-preview');
  const dateInput = document.getElementById('meal-date');
  const descInput = document.getElementById('meal-desc');

  if (dateInput) dateInput.value = todayStr();

  cameraBtn?.addEventListener('click', async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      openCameraModal(stream);
    } catch {
      showToast(t('meals.cameraUnavailable'), 'error');
    }
  });

  uploadBtn?.addEventListener('click', () => fileInput?.click());

  fileInput?.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      if (preview) { preview.src = e.target.result; preview.style.display = 'block'; }
      if (preview) preview._dataUrl = e.target.result;
    };
    reader.readAsDataURL(file);
  });

  saveBtn?.addEventListener('click', async () => {
    const photoDataUrl = preview?._dataUrl || null;
    const description  = descInput?.value.trim() || t('meals.labelDesc');
    const date         = dateInput?.value || todayStr();
    const meal         = await addMeal({ photoDataUrl, description, date });
    meals.push(meal);
    renderMealsGallery();
    showToast(t('toast.mealSaved'));
    if (preview) { preview.src = ''; preview.style.display = 'none'; preview._dataUrl = null; }
    if (descInput) descInput.value = '';
    if (fileInput) fileInput.value = '';
  });
}

function openCameraModal(stream) {
  const modal      = document.getElementById('camera-modal');
  const video      = document.getElementById('camera-video');
  const captureBtn = document.getElementById('camera-capture');
  const closeBtn   = document.getElementById('camera-close');
  const preview    = document.getElementById('meal-preview');

  if (!modal || !video) { stream.getTracks().forEach((tr) => tr.stop()); return; }

  video.srcObject = stream;
  video.play();
  modal.classList.add('modal--open');

  captureBtn?.addEventListener('click', () => {
    const canvas = document.createElement('canvas');
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    if (preview) { preview.src = dataUrl; preview.style.display = 'block'; preview._dataUrl = dataUrl; }
    stream.getTracks().forEach((tr) => tr.stop());
    modal.classList.remove('modal--open');
  }, { once: true });

  closeBtn?.addEventListener('click', () => {
    stream.getTracks().forEach((tr) => tr.stop());
    modal.classList.remove('modal--open');
  }, { once: true });
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
  meals.forEach((m) => { if (!byDate[m.date]) byDate[m.date] = []; byDate[m.date].push(m); });

  gallery.innerHTML = Object.keys(byDate).sort((a, b) => b.localeCompare(a)).map((date) => `
    <div class="meal-group">
      <h4 class="meal-group__date">${formatDate(date)}</h4>
      <div class="meal-group__photos">
        ${byDate[date].map(mealThumb).join('')}
      </div>
    </div>`).join('');

  gallery.querySelectorAll('[data-delete-meal]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = Number(btn.dataset.deleteMeal);
      await deleteMeal(id);
      meals = meals.filter((m) => m.id !== id);
      renderMealsGallery();
      showToast(t('toast.mealDeleted'));
    });
  });
}

function mealThumb(m) {
  return `
    <div class="meal-thumb">
      ${m.photoDataUrl
        ? `<img src="${m.photoDataUrl}" alt="${escHtml(m.description)}" class="meal-thumb__img">`
        : `<div class="meal-thumb__placeholder">🍽️</div>`}
      <p class="meal-thumb__desc">${escHtml(m.description)}</p>
      <button class="icon-btn meal-thumb__delete" data-delete-meal="${m.id}">🗑️</button>
    </div>`;
}

function escHtml(str = '') {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
