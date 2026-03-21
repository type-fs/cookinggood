import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut as fbSignOut } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getDatabase, ref, onValue, set, get } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js';
import { state, setAuth, setDb, setCurrentUser } from './state.js';
import { showLogin, showApp } from './auth.js';
import { showToast } from './actions.js';

export const FIREBASE_CFG = {
  apiKey:      "__FIREBASE_API_KEY__",
  authDomain:  "__FIREBASE_AUTH_DOMAIN__",
  databaseURL: "__FIREBASE_DATABASE_URL__",
  projectId:   "__FIREBASE_PROJECT_ID__",
};

// boot accepts a renderAll callback to avoid circular imports with app.js
export function boot(cfg, renderAll) {
  try {
    const fbApp = initializeApp(cfg);
    const auth = getAuth(fbApp);
    const db = getDatabase(fbApp);
    setAuth(auth);
    setDb(db);

    onAuthStateChanged(auth, async user => {
      if (user) {
        const allowed = await get(ref(db, `allowedUsers/${user.uid}`));
        if (!allowed.exists()) {
          await fbSignOut(auth);
          showToast('You are not on the guest list.');
          showLogin();
          return;
        }
        setCurrentUser(user);
        await set(ref(db, `users/${user.uid}`), {
          displayName: user.displayName,
          photoURL: user.photoURL || '',
        });
        showApp();
        subscribe(db, renderAll);
      } else {
        setCurrentUser(null);
        showLogin();
      }
    });
  } catch (e) {
    showToast('Firebase error.');
    console.error(e);
    document.getElementById('loading-screen').classList.add('hidden');
  }
}

function subscribe(db, renderAll) {
  onValue(ref(db, 'events'), snap => { state.events = snap.val() || {}; renderAll(); });
  onValue(ref(db, 'dishes'), snap => { state.dishes = snap.val() || {}; renderAll(); });
  onValue(ref(db, 'users'),  snap => { state.users  = snap.val() || {}; renderAll(); });
}
