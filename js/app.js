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

// ── WINDOW BINDINGS ──
// These are needed because HTML onclick attributes reference window globals.
window.signInWithGoogle = signInWithGoogle;
window.doSignOut = doSignOut;
window.switchView = switchView;
window.joinEvent = joinEvent;
window.leaveEvent = leaveEvent;
window.castVote = castVote;
window.openModal = openModal;
window.closeModal = closeModal;
window.openAddEvent = openAddEvent;
window.openEditEvent = openEditEvent;
window.openSuggestDish = openSuggestDish;
window.openEditDish = openEditDish;
window.toggleExpand = toggleExpand;
window.saveEvent = saveEvent;
window.saveDish = saveDish;
window.setApprovedDish = setApprovedDish;
window.suggestDishAgain = suggestDishAgain;
window.confirmDelete = confirmDelete;
window.executeDelete = executeDelete;
window.showToast = showToast;
window.renderAll = renderAll;

// ── BOOT ──
boot(FIREBASE_CFG, renderAll);
