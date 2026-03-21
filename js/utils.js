import { state } from './state.js';

export const trashIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`;

export const evArr = () => Object.entries(state.events).map(([id, v]) => ({ id, ...v }));
export const dsArr = () => Object.entries(state.dishes).map(([id, v]) => ({ id, ...v }));
export const today = () => new Date().toISOString().split('T')[0];
export const esc = s => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export const uName = uid => state.users[uid]?.displayName || 'Someone';
export const uPhoto = uid => state.users[uid]?.photoURL || '';

export const avatar = (uid, sz = 20) => {
  const p = uPhoto(uid);
  return p
    ? `<img src="${esc(p)}" width="${sz}" height="${sz}" alt="${esc(uName(uid))}" title="${esc(uName(uid))}" style="border-radius:50%;object-fit:cover" />`
    : `<span style="display:inline-flex;align-items:center;justify-content:center;width:${sz}px;height:${sz}px;border-radius:50%;background:var(--warm-tan);font-size:${sz * 0.5}px">${esc(uName(uid))[0] || '?'}</span>`;
};

export const fmtDate = d => new Date(d + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
export const fmtShort = d => new Date(d + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' });
