import { ref, update } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js';
import { state, db } from './state.js';
import { today } from './utils.js';
import { FIREBASE_CFG, boot } from './firebase.js';
import { signInWithGoogle, doSignOut, switchView } from './auth.js';
import { renderEvents, joinEvent, leaveEvent } from './render-events.js';
import { renderDishes, castVote } from './render-dishes.js';
import {
  showToast, openModal, closeModal,
  openAddEvent, openEditEvent, openSuggestDish, openEditDish,
  toggleExpand, saveEvent, saveDish, setApprovedDish, suggestDishAgain,
  confirmDelete, executeDelete, setRenderAll,
} from './actions.js';

// ── RENDER ALL ──
export function renderAll() {
  // Auto-transition: planned → cooked when event date is past
  for (const [id, d] of Object.entries(state.dishes)) {
    if (d.status === 'planned' && d.eventId) {
      const ev = state.events[d.eventId];
      if (ev && ev.date < today()) {
        update(ref(db, `dishes/${id}`), { status: 'cooked' });
      }
    }
  }
  renderEvents();
  renderDishes();
}

// Give actions.js access to renderAll (for delete confirmation timeout)
setRenderAll(renderAll);

// ── STATIC EVENT LISTENERS ──
// Sign-in button
document.querySelector('.google-btn').addEventListener('click', signInWithGoogle);

// User chip (sign out)
document.querySelector('.user-chip').addEventListener('click', doSignOut);

// Nav tabs
document.querySelector('nav').addEventListener('click', e => {
  const btn = e.target.closest('[data-view]');
  if (btn) switchView(btn.dataset.view);
});

// Modal overlays: close on background click, stop propagation on .modal
for (const id of ['add-event-modal', 'suggest-dish-modal']) {
  const overlay = document.getElementById(id);
  overlay.addEventListener('click', () => closeModal(id));
  overlay.querySelector('.modal').addEventListener('click', e => e.stopPropagation());
}

// Modal buttons
document.getElementById('event-modal-submit').addEventListener('click', saveEvent);
document.getElementById('event-modal-cancel').addEventListener('click', () => closeModal('add-event-modal'));
document.getElementById('dish-modal-submit').addEventListener('click', saveDish);
document.getElementById('dish-modal-cancel').addEventListener('click', () => closeModal('suggest-dish-modal'));

// ── EVENT DELEGATION FOR DYNAMIC CONTENT ──
const clickActions = {
  openAddEvent:    () => openAddEvent(),
  openSuggestDish: () => openSuggestDish(),
  openEditEvent:   el => openEditEvent(el.dataset.id),
  openEditDish:    el => openEditDish(el.dataset.id),
  joinEvent:       el => joinEvent(el.dataset.id),
  leaveEvent:      el => leaveEvent(el.dataset.id),
  castVote:        el => castVote(el.dataset.id, el.dataset.dir),
  suggestDishAgain:el => suggestDishAgain(el.dataset.id),
  confirmDelete:   el => confirmDelete(el.dataset.type, el.dataset.id, el),
  executeDelete:   el => executeDelete(el.dataset.type, el.dataset.id),
  renderAll:       () => renderAll(),
  toggleExpand:    el => toggleExpand(el),
};

function handleDelegatedClick(e) {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const handler = clickActions[el.dataset.action];
  if (handler) handler(el);
}

function handleDelegatedChange(e) {
  const el = e.target.closest('[data-action="setApprovedDish"]');
  if (el) setApprovedDish(el.dataset.eventId, el.value);
}

document.getElementById('events-content').addEventListener('click', handleDelegatedClick);
document.getElementById('events-content').addEventListener('change', handleDelegatedChange);
document.getElementById('dishes-content').addEventListener('click', handleDelegatedClick);

// ── BOOT ──
boot(FIREBASE_CFG, renderAll);
