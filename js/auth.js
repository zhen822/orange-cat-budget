/**
 * auth.js — Authentication state management
 *
 * Handles:
 *  - Watching Firebase auth state
 *  - Redirecting to login.html when not signed in
 *  - Rendering user avatar + name in the sidebar
 *  - Sign-out
 */

import { onAuthReady, signInWithGoogle, signOutUser, getCurrentUser } from './firebase.js';

// ─── Guard — call on every page that requires login ──────────────────────────

/**
 * Wait for Firebase auth to resolve.
 * If no user → redirect to login.html.
 * If user → return the user object.
 */
export async function requireAuth() {
  return new Promise((resolve) => {
    onAuthReady((user) => {
      if (!user) {
        window.location.href = 'login.html';
      } else {
        renderUserBadge(user);
        resolve(user);
      }
    });
  });
}

// ─── Render user info in sidebar ─────────────────────────────────────────────

function renderUserBadge(user) {
  const badge = document.getElementById('user-badge');
  if (!badge) return;

  const name  = user.displayName || user.email || 'User';
  const photo = user.photoURL;
  const initials = name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  badge.innerHTML = `
    <div class="user-badge">
      ${photo
        ? `<img src="${photo}" alt="${name}" class="user-badge__avatar" referrerpolicy="no-referrer">`
        : `<div class="user-badge__initials">${initials}</div>`}
      <div class="user-badge__info">
        <span class="user-badge__name">${escHtml(name.split(' ')[0])}</span>
        <button class="user-badge__signout" id="signout-btn">Sign out</button>
      </div>
    </div>`;

  document.getElementById('signout-btn')?.addEventListener('click', async () => {
    await signOutUser();
    window.location.href = 'login.html';
  });
}

// ─── Login page logic ─────────────────────────────────────────────────────────

export async function initLoginPage() {
  // If already signed in, go straight to dashboard
  onAuthReady((user) => {
    if (user) window.location.href = 'index.html';
  });

  document.getElementById('google-signin-btn')?.addEventListener('click', async () => {
    const btn = document.getElementById('google-signin-btn');
    btn.disabled = true;
    btn.textContent = 'Signing in…';
    try {
      await signInWithGoogle();
      window.location.href = 'index.html';
    } catch (err) {
      console.error('Sign-in error:', err);
      btn.disabled = false;
      btn.textContent = 'Continue with Google';
      const errEl = document.getElementById('signin-error');
      if (errEl) errEl.textContent = 'Sign-in failed. Please try again.';
    }
  });
}

function escHtml(s = '') {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
