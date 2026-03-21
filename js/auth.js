import { GoogleAuthProvider, signInWithPopup, signOut as fbSignOut } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { auth, currentUser } from './state.js';
import { showToast } from './actions.js';

export async function signInWithGoogle() {
  try { await signInWithPopup(auth, new GoogleAuthProvider()); }
  catch (e) { showToast('Sign-in failed.'); console.error(e); }
}

export async function doSignOut() {
  await fbSignOut(auth);
}

export function showLogin() {
  document.getElementById('loading-screen').classList.add('hidden');
  document.getElementById('login-screen').style.display = 'block';
  document.getElementById('main-app').style.display = 'none';
}

export function showApp() {
  document.getElementById('loading-screen').classList.add('hidden');
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('main-app').style.display = 'block';
  const first = currentUser.displayName?.split(' ')[0] || 'You';
  document.getElementById('user-display-name').textContent = first;
  document.getElementById('user-avatar').src = currentUser.photoURL || '';
}

export function switchView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
  document.getElementById(`view-${name}`).classList.add('active');
  document.querySelector(`[data-view="${name}"]`).classList.add('active');
}
