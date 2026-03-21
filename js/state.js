// Shared application state — dependency-free module to avoid circular imports.

export let auth = null;
export let db = null;
export let currentUser = null;
export let editingDishId = null;
export let editingEventId = null;
export const state = { events: {}, dishes: {}, users: {} };

export function setAuth(v) { auth = v; }
export function setDb(v) { db = v; }
export function setCurrentUser(v) { currentUser = v; }
export function setEditingDishId(v) { editingDishId = v; }
export function setEditingEventId(v) { editingEventId = v; }
