import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, connectAuthEmulator, onAuthStateChanged, signOut as fbSignOut } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getDatabase, connectDatabaseEmulator, ref, onValue, set, get } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js';
import { state, setAuth, setDb, setCurrentUser } from './state.js';
import { showLogin, showApp } from './auth.js';
import { showToast } from './actions.js';

const LOCAL_DEV_CFG = {
  apiKey:      "fake-api-key",
  authDomain:  "localhost",
  databaseURL: "http://localhost:9000",
  projectId:   "demo-cookinggood",
};

const PROD_CFG = {
  apiKey:      "__FIREBASE_API_KEY__",
  authDomain:  "__FIREBASE_AUTH_DOMAIN__",
  databaseURL: "__FIREBASE_DATABASE_URL__",
  projectId:   "__FIREBASE_PROJECT_ID__",
};

const isLocal = typeof location !== 'undefined'
  && (location.hostname === 'localhost' || location.hostname === '127.0.0.1');

export const FIREBASE_CFG = isLocal || PROD_CFG.apiKey.startsWith('__')
  ? LOCAL_DEV_CFG
  : PROD_CFG;

// boot accepts a renderAll callback to avoid circular imports with app.js
export function boot(cfg, renderAll) {
  try {
    const fbApp = initializeApp(cfg);
    const auth = getAuth(fbApp);
    const db = getDatabase(fbApp);

    if (isLocal) {
      connectAuthEmulator(auth, 'http://localhost:9099');
      connectDatabaseEmulator(db, 'localhost', 9000);
    }

    setAuth(auth);
    setDb(db);

    onAuthStateChanged(auth, async user => {
      try {
        if (user) {
          if (!isLocal) {
            const allowed = await get(ref(db, `allowedUsers/${user.uid}`));
            if (!allowed.exists()) {
              await fbSignOut(auth);
              showToast('You are not on the guest list.');
              showLogin();
              return;
            }
          }
          setCurrentUser(user);
          await set(ref(db, `users/${user.uid}`), {
            displayName: user.displayName,
            photoURL: user.photoURL || '',
          });
          showApp();
          renderAll();
          subscribe(db, renderAll);
        } else {
          setCurrentUser(null);
          showLogin();
        }
      } catch (e) {
        console.error('Auth state handler error:', e);
        showToast('Something went wrong.');
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
