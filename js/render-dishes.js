import { ref, update, remove } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js';
import { state, currentUser, db } from './state.js';
import { dsArr, esc, isSafeUrl, trashIcon } from './utils.js';
import { showToast } from './actions.js';

export function netScore(d) {
  if (!d.votes) return 0;
  return Object.values(d.votes).reduce((sum, v) => sum + (v === true ? 1 : Number(v) || 0), 0);
}

export function votesByDir(d) {
  const up = [], down = [];
  if (!d.votes) return { up, down };
  for (const [uid, v] of Object.entries(d.votes)) {
    const n = v === true ? 1 : Number(v) || 0;
    if (n > 0) up.push(uid);
    else if (n < 0) down.push(uid);
  }
  return { up, down };
}

export function renderDishes() {
  const el = document.getElementById('dishes-content');
  const all = dsArr();
  const suggested = all.filter(d => d.status === 'suggested').sort((a, b) => netScore(b) - netScore(a));
  const planned = all.filter(d => d.status === 'planned');
  const cooked = all.filter(d => d.status === 'cooked');
  const discarded = all.filter(d => d.status === 'discarded');

  let html = `<div class="action-bar"><button class="btn btn-primary" onclick="openSuggestDish()">+ Suggest Dish</button></div>`;

  if (!all.length) {
    html += `<div class="empty"><div class="icon">🍽️</div><p>No dishes yet. Suggest the first one!</p></div>`;
    el.innerHTML = html;
    return;
  }

  html += suggested.map(d => renderDishCard(d, true)).join('');

  if (planned.length) {
    html += `<div class="section-title" style="margin-top:24px">Planned</div>`;
    html += planned.map(d => renderDishCard(d, false)).join('');
  }

  if (cooked.length) {
    html += `<div class="section-title" style="margin-top:24px">Cooked</div>`;
    html += cooked.map(d => renderDishCard(d, false, 'cookAgain')).join('');
  }

  if (discarded.length) {
    html += `
      <button class="expand-toggle" onclick="toggleExpand(this)">
        <span class="arrow">&#9654;</span> Discarded (${discarded.length})
      </button>
      <div class="expand-content">
        ${discarded.map(d => renderDishCard(d, false, 'suggestAgain')).join('')}
      </div>`;
  }

  el.innerHTML = html;
}

function renderDishCard(d, showVoting, action) {
  const myVote = currentUser && d.votes ? (d.votes[currentUser.uid] ?? 0) : 0;
  const myVoteNorm = myVote === true ? 1 : Number(myVote) || 0;
  const { up, down } = votesByDir(d);
  const label = d.status.charAt(0).toUpperCase() + d.status.slice(1);

  let actionBtn = '';
  if (action === 'cookAgain')    actionBtn = `<button class="btn btn-secondary btn-sm" onclick="suggestDishAgain('${d.id}')">Cook Again</button>`;
  if (action === 'suggestAgain') actionBtn = `<button class="btn btn-secondary btn-sm" onclick="suggestDishAgain('${d.id}')">Suggest Again</button>`;

  const voteHtml = showVoting ? `
      <div class="vote-rows">
        <div class="vote-row">
          <button class="vote-thumb ${myVoteNorm === 1 ? 'active-up' : ''}" onclick="castVote('${d.id}','up')" title="Upvote">&#x1F44D;</button>
          <span class="vote-count up">+${up.length}</span>
        </div>
        <div class="vote-row">
          <button class="vote-thumb ${myVoteNorm === -1 ? 'active-down' : ''}" onclick="castVote('${d.id}','down')" title="Downvote">&#x1F44E;</button>
          <span class="vote-count down">-${down.length}</span>
        </div>
      </div>` : '';

  const textParts = [d.ingredients, d.recipeText].filter(Boolean).map(t => esc(t));
  const recipeTextHtml = textParts.length ? `<div class="recipe-text">${textParts.join('\n\n')}</div>` : '';

  let bodyHtml = '';
  if (recipeTextHtml && voteHtml) {
    bodyHtml = `<div class="dish-body">${recipeTextHtml}${voteHtml}</div>`;
  } else if (recipeTextHtml) {
    bodyHtml = recipeTextHtml;
  } else if (voteHtml) {
    bodyHtml = voteHtml;
  }

  return `
  <div class="card">
    <div class="dish-card">
        <div class="card-label">${label}</div>
        <h3>${esc(d.name)}</h3>
        ${d.recipeUrl ? (isSafeUrl(d.recipeUrl) ? `<a class="recipe-link" href="${esc(d.recipeUrl)}" target="_blank" rel="noopener">→ Recipe link</a>` : `<span class="recipe-link">${esc(d.recipeUrl)}</span>`) : ''}
        ${bodyHtml}
        <div class="mt-8 gap-8">
          <button class="btn btn-secondary btn-sm" onclick="openEditDish('${d.id}')">Edit</button>
          ${actionBtn}
          <button class="delete-btn" onclick="confirmDelete('dish','${d.id}',this)" title="Delete dish">${trashIcon}</button>
        </div>
    </div>
  </div>`;
}

export async function castVote(dishId, dir) {
  try {
    const current = state.dishes[dishId]?.votes?.[currentUser.uid];
    const currentNorm = current === true ? 1 : Number(current) || 0;
    const target = dir === 'up' ? 1 : -1;
    if (currentNorm === target) {
      await remove(ref(db, `dishes/${dishId}/votes/${currentUser.uid}`));
    } else {
      await update(ref(db, `dishes/${dishId}/votes`), { [currentUser.uid]: target });
      if (target === -1 && state.dishes[dishId]?.status === 'suggested') {
        const userIds = Object.keys(state.users);
        const votes = { ...state.dishes[dishId]?.votes, [currentUser.uid]: target };
        const allDownvoted = userIds.length > 0 && userIds.every(uid => {
          const v = votes[uid];
          return v === -1 || v === true ? false : (Number(v) || 0) === -1;
        });
        if (allDownvoted) {
          await update(ref(db, `dishes/${dishId}`), { status: 'discarded' });
          showToast('Everyone vetoed — dish discarded.');
        }
      }
    }
  } catch (e) {
    console.error('castVote failed:', e);
    showToast('Something went wrong.');
  }
}
