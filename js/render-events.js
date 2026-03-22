import { ref, update, remove } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js';
import { state, currentUser, db } from './state.js';
import { evArr, dsArr, today, esc, isSafeUrl, uName, avatar, fmtDate, trashIcon } from './utils.js';
import { netScore, votesByDir } from './render-dishes.js';
import { showToast } from './actions.js';

export function renderEvents() {
  const el = document.getElementById('events-content');
  const upcoming = evArr().filter(e => e.date >= today()).sort((a, b) => a.date.localeCompare(b.date));
  const past = evArr().filter(e => e.date < today()).sort((a, b) => b.date.localeCompare(a.date));

  let html = `<div class="action-bar"><button class="btn btn-primary" onclick="openAddEvent()">+ Add Event</button></div>`;

  if (!upcoming.length && !past.length) {
    html += `<div class="empty"><div class="icon">📅</div><p>No events yet. Create the first one!</p></div>`;
    el.innerHTML = html;
    return;
  }

  html += upcoming.map(ev => renderEventCard(ev, true)).join('');

  if (past.length) {
    html += `
      <button class="expand-toggle" onclick="toggleExpand(this)">
        <span class="arrow">&#9654;</span> Past events (${past.length})
      </button>
      <div class="expand-content">
        ${past.map(ev => renderEventCard(ev, false)).join('')}
      </div>`;
  }

  el.innerHTML = html;
}

function renderEventCard(ev, isUpcoming) {
  const dish = ev.approvedDishId ? state.dishes[ev.approvedDishId] : null;
  const attendees = ev.attendees ? Object.keys(ev.attendees) : [];
  const myRsvp = currentUser && attendees.includes(currentUser.uid);
  const dt = new Date(ev.date + 'T12:00:00');
  const chips = attendees.map(uid => `<span class="rsvp-chip light">${avatar(uid, 18)} ${esc(uName(uid))}</span>`).join('');

  let dishHtml;
  if (isUpcoming) {
    const candidates = dsArr()
      .filter(d => d.status === 'suggested' || (d.id === ev.approvedDishId && d.status === 'planned'))
      .sort((a, b) => netScore(b) - netScore(a));
    const options = candidates.map(d => {
      const sel = ev.approvedDishId === d.id ? 'selected' : '';
      const { up, down } = votesByDir(d);
      const scoreLabel = (up.length || down.length) ? ` (+${up.length} / -${down.length})` : '';
      return `<option value="${d.id}" ${sel}>${esc(d.name)}${scoreLabel}</option>`;
    }).join('');
    dishHtml = `<select class="dish-select" onchange="setApprovedDish('${ev.id}', this.value)">
      <option value="" ${!ev.approvedDishId ? 'selected' : ''}>— No dish —</option>
      ${options}
    </select>`;
  } else {
    dishHtml = `<h3>${dish ? esc(dish.name) : '<em style="color:var(--muted)">No dish set</em>'}</h3>`;
  }

  return `
  <div class="card">
    <div class="event-card-grid">
      <div class="history-date">
        <div class="day">${dt.getDate()}</div>
        <div class="month">${dt.toLocaleDateString('de-DE', { month: 'short' })}</div>
      </div>
      <div>
        <div class="card-label">${fmtDate(ev.date)}</div>
        ${dishHtml}
        ${dish?.recipeUrl ? (isSafeUrl(dish.recipeUrl) ? `<a class="recipe-link" href="${esc(dish.recipeUrl)}" target="_blank" rel="noopener">→ Recipe</a>` : `<span class="recipe-link">${esc(dish.recipeUrl)}</span>`) : ''}
        ${dish?.ingredients ? `<div class="recipe-text" style="max-height:80px">${esc(dish.ingredients)}</div>` : ''}
        ${dish?.recipeText ? `<div class="recipe-text" style="max-height:80px">${esc(dish.recipeText)}</div>` : ''}
        <div class="rsvp-attendees mt-8">${chips || '<span class="text-muted">No attendees yet</span>'}</div>
        <div class="mt-8 gap-8">
          ${isUpcoming ? `${myRsvp
            ? `<button class="btn btn-secondary btn-sm" onclick="leaveEvent('${ev.id}')">You're in — Leave</button>`
            : `<button class="btn btn-primary btn-sm" onclick="joinEvent('${ev.id}')">I'm coming</button>`
          }` : ''}
          <button class="btn btn-secondary btn-sm" onclick="openEditEvent('${ev.id}')">Edit</button>
          <button class="delete-btn" onclick="confirmDelete('event','${ev.id}',this)" title="Delete event">${trashIcon}</button>
        </div>
      </div>
    </div>
  </div>`;
}

export async function joinEvent(eventId) {
  try {
    await update(ref(db, `events/${eventId}/attendees`), { [currentUser.uid]: true });
  } catch (e) {
    console.error('joinEvent failed:', e);
    showToast('Something went wrong.');
  }
}

export async function leaveEvent(eventId) {
  try {
    await remove(ref(db, `events/${eventId}/attendees/${currentUser.uid}`));
  } catch (e) {
    console.error('leaveEvent failed:', e);
    showToast('Something went wrong.');
  }
}
