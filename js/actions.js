import { ref, update, push, remove } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js';
import { state, currentUser, db, editingDishId, editingEventId, setEditingDishId, setEditingEventId } from './state.js';
import { evArr } from './utils.js';

// ── TOAST ──
let toastTimer;
export function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
}

// ── MODALS ──
export function openModal(id) {
  document.getElementById(id).classList.remove('hidden');
}

export function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
  if (id === 'suggest-dish-modal') setEditingDishId(null);
  if (id === 'add-event-modal') setEditingEventId(null);
}

export function openAddEvent() {
  setEditingEventId(null);
  document.getElementById('new-event-date').value = '';
  document.getElementById('event-modal-title').textContent = 'Add Event';
  document.getElementById('event-modal-submit').textContent = 'Add Event';
  openModal('add-event-modal');
}

export function openEditEvent(id) {
  const ev = state.events[id];
  if (!ev) return;
  setEditingEventId(id);
  document.getElementById('new-event-date').value = ev.date || '';
  document.getElementById('event-modal-title').textContent = 'Edit Event';
  document.getElementById('event-modal-submit').textContent = 'Update';
  openModal('add-event-modal');
}

export function openSuggestDish() {
  setEditingDishId(null);
  ['new-dish-name', 'new-dish-url', 'new-dish-ingredients', 'new-dish-text'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('dish-modal-title').textContent = 'Suggest a Dish';
  document.getElementById('dish-modal-submit').textContent = 'Suggest Dish';
  openModal('suggest-dish-modal');
}

export function openEditDish(id) {
  const d = state.dishes[id];
  if (!d) return;
  setEditingDishId(id);
  document.getElementById('new-dish-name').value = d.name || '';
  document.getElementById('new-dish-url').value = d.recipeUrl || '';
  document.getElementById('new-dish-ingredients').value = d.ingredients || '';
  document.getElementById('new-dish-text').value = d.recipeText || '';
  document.getElementById('dish-modal-title').textContent = 'Edit Dish';
  document.getElementById('dish-modal-submit').textContent = 'Update';
  openModal('suggest-dish-modal');
}

// ── EXPAND TOGGLE ──
export function toggleExpand(btn) {
  btn.classList.toggle('open');
  const content = btn.nextElementSibling;
  content.classList.toggle('open');
}

// ── WRITE ACTIONS ──
export async function saveEvent() {
  const date = document.getElementById('new-event-date').value;
  if (!date) { showToast('Pick a date.'); return; }
  const duplicate = evArr().find(e => e.date === date && e.id !== editingEventId);
  if (duplicate) { showToast('An event on this date already exists.'); return; }
  try {
    if (editingEventId) {
      await update(ref(db, `events/${editingEventId}`), { date });
      showToast('Event updated.');
    } else {
      await push(ref(db, 'events'), { date, attendees: {}, approvedDishId: null, createdBy: currentUser.uid });
      showToast('Event added.');
    }
    document.getElementById('new-event-date').value = '';
    closeModal('add-event-modal');
  } catch (e) {
    console.error('saveEvent failed:', e);
    showToast('Save failed. Please try again.');
  }
}

export async function saveDish() {
  const name = document.getElementById('new-dish-name').value.trim();
  if (!name) { showToast('Enter a dish name.'); return; }
  const fields = {
    name,
    recipeUrl:   document.getElementById('new-dish-url').value.trim(),
    ingredients: document.getElementById('new-dish-ingredients').value.trim(),
    recipeText:  document.getElementById('new-dish-text').value.trim(),
  };
  try {
    if (editingDishId) {
      await update(ref(db, `dishes/${editingDishId}`), fields);
      showToast('Dish updated.');
    } else {
      await push(ref(db, 'dishes'), {
        ...fields,
        status: 'suggested',
        eventId: null,
        votes: {},
        suggestedBy: currentUser.uid,
      });
      showToast('Dish suggested.');
    }
    ['new-dish-name', 'new-dish-url', 'new-dish-ingredients', 'new-dish-text'].forEach(id => document.getElementById(id).value = '');
    closeModal('suggest-dish-modal');
  } catch (e) {
    console.error('saveDish failed:', e);
    showToast('Save failed. Please try again.');
  }
}

export async function setApprovedDish(eventId, newDishId) {
  try {
    const oldDishId = state.events[eventId]?.approvedDishId;
    if (oldDishId && oldDishId !== newDishId && state.dishes[oldDishId]?.status === 'planned') {
      await update(ref(db, `dishes/${oldDishId}`), { status: 'suggested', eventId: null });
    }
    if (newDishId && state.dishes[newDishId]?.status === 'suggested') {
      await update(ref(db, `dishes/${newDishId}`), { status: 'planned', eventId: eventId });
    }
    await update(ref(db, `events/${eventId}`), { approvedDishId: newDishId || null });
  } catch (e) {
    console.error('setApprovedDish failed:', e);
    showToast('Something went wrong.');
  }
}

export async function suggestDishAgain(dishId) {
  try {
    await update(ref(db, `dishes/${dishId}`), { status: 'suggested', eventId: null, votes: {} });
    showToast('Dish suggested again.');
  } catch (e) {
    console.error('suggestDishAgain failed:', e);
    showToast('Something went wrong.');
  }
}

// ── DELETE ──
let deleteTimer = null;

// renderAll is passed in from app.js to avoid circular imports
let _renderAll = null;
export function setRenderAll(fn) { _renderAll = fn; }

export function confirmDelete(type, id, btn) {
  clearTimeout(deleteTimer);
  btn.outerHTML = `<span class="delete-confirm">Delete?
    <button class="btn-danger" onclick="executeDelete('${type}','${id}')">Yes</button>
    <button class="btn btn-secondary btn-sm" onclick="renderAll()">No</button>
  </span>`;
  deleteTimer = setTimeout(() => _renderAll && _renderAll(), 5000);
}

export async function executeDelete(type, id) {
  clearTimeout(deleteTimer);
  try {
    if (type === 'event') {
      const oldDishId = state.events[id]?.approvedDishId;
      if (oldDishId && state.dishes[oldDishId]?.status === 'planned') {
        await update(ref(db, `dishes/${oldDishId}`), { status: 'suggested', eventId: null });
      }
      await remove(ref(db, `events/${id}`));
      showToast('Event deleted.');
    } else {
      const d = state.dishes[id];
      if (d?.status === 'planned' && d?.eventId) {
        await update(ref(db, `events/${d.eventId}`), { approvedDishId: null });
      }
      await remove(ref(db, `dishes/${id}`));
      showToast('Dish deleted.');
    }
  } catch (e) {
    console.error('executeDelete failed:', e);
    showToast('Delete failed. Please try again.');
  }
}
