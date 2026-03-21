# Kochabend — Claude Code Context

## What this application is

Kochabend is a single-page web app for a small private group to organise weekly cooking evenings. It runs entirely in the browser with no custom backend. Auth and data storage are handled by Firebase. The app is hosted on GitHub Pages. The only build step is placeholder substitution for the Firebase config, handled by the GitHub Actions deploy workflow.

## Tech stack

- Vanilla HTML, CSS, JavaScript. No framework, no bundler, no npm.
- Firebase 10 (ESM via CDN): Authentication, Realtime Database.
- Google Sign-In via Firebase Auth (popup flow).
- Google Fonts: Cormorant Garamond (headings), Nunito (body).
- No `data/` folder. No GitHub API. All persistence is Firebase.

## Firebase data model

All data lives in Firebase Realtime Database under four top-level keys.

**`/allowedUsers/{uid}`**

A presence map of UIDs permitted to use the app. Managed manually in the Firebase console. The app checks this node on every auth state change and signs the user out if their UID is missing.

| field | type | description |
|---|---|---|
| *(value)* | `true` | Presence flag — UID must exist here for the user to access the app |

**`/users/{uid}`**

Populated automatically on every sign-in.

| field | type | description |
|---|---|---|
| `displayName` | string | Google display name |
| `photoURL` | string | Google profile photo URL |

**`/events/{pushId}`**

A cooking evening.

| field | type | description |
|---|---|---|
| `date` | string | ISO date `YYYY-MM-DD` |
| `attendees` | `{ [uid]: true }` | Firebase presence map of RSVPs |
| `plannedDishId` | string \| null | push ID of the planned dish |
| `createdBy` | string | uid of creator |

**`/dishes/{pushId}`**

A dish suggestion or history entry.

| field | type | description |
|---|---|---|
| `name` | string | dish name |
| `status` | enum | `suggested`, `planned`, `cooked`, `discarded` |
| `recipeUrl` | string | link to recipe, may be empty |
| `recipeText` | string | pasted recipe text, may be empty |
| `ingredients` | string | ingredients list, may be empty |
| `eventId` | string \| null | push ID of assigned event |
| `votes` | `{ [uid]: 1 \| -1 }` | Vote map: `1` = upvote, `-1` = downvote. Each user may cast one vote per dish. |
| `suggestedBy` | string | uid of suggester |

Firebase presence maps (`{ uid: true }`) are used instead of arrays to avoid index conflicts on concurrent writes.

## Auth model

Google Sign-In via Firebase popup. After successful sign-in, the app checks `/allowedUsers/{uid}` in the Realtime Database. If the UID is not present, the user is signed out immediately and shown a "not on the guest list" message. This is enforced client-side on every auth state change. For full server-side enforcement, Firebase database rules should also check that `auth.uid` exists in `/allowedUsers`.

The Firebase config is defined as `FIREBASE_CFG` in `js/firebase.js`. In the source repository, the four values are placeholders (`__FIREBASE_API_KEY__`, etc.) that are replaced at build time by the GitHub Actions deploy workflow using repository secrets. The values are still visible in the deployed page source but are absent from the git history. Firebase API keys only identify the project — they do not grant access. All authorization is enforced server-side by Firebase Authentication and database rules.

## Application state

State is held in `js/state.js` as a shared `state` object: `{ events: {}, dishes: {}, users: {} }`. All three nodes are subscribed via `onValue` listeners that fire on any change. Each listener updates the relevant key and calls `renderAll()`. There is no local mutation. All writes go directly to Firebase and trigger re-renders via the subscription.

## Views

- **Events** — lists all cooking events. Upcoming events show date, approved dish, attendees, and RSVP join/leave buttons. Past events are hidden under an expandable "Past events" section. An "Add Event" button at the top opens a modal with a date picker.
- **Dishes** — lists all dishes grouped by status. Suggested/approved dishes appear first with voting (sorted by vote count). Cooked dishes appear next. Discarded dishes are hidden under an expandable section. A "Suggest Dish" button at the top opens a modal for name, recipe link, ingredients, and recipe text.

## Setup flow

The `index.html` source contains placeholder strings for the Firebase config. The GitHub Actions deploy workflow (`deploy.yml`) substitutes them with real values from repository secrets before publishing to GitHub Pages. On load, Firebase is initialised immediately and the user sees the Google Sign-In screen.

## Deployment

The app is deployed to GitHub Pages via a GitHub Actions workflow (`.github/workflows/deploy.yml`). On every push to `main`, the workflow:

1. Checks out the repo.
2. Replaces the four `__FIREBASE_*__` placeholders in `js/firebase.js` with values from GitHub Actions secrets.
3. Uploads the result as a Pages artifact and deploys it.

**Required secrets** (set under Settings → Secrets and variables → Actions):

| Secret name | Example value |
|---|---|
| `FIREBASE_API_KEY` | `AIzaSy…` |
| `FIREBASE_AUTH_DOMAIN` | `your-project.firebaseapp.com` |
| `FIREBASE_DATABASE_URL` | `https://your-project-default-rtdb.firebaseio.com` |
| `FIREBASE_PROJECT_ID` | `your-project-id` |

**GitHub Pages source** must be set to "GitHub Actions" (Settings → Pages → Source), not branch deployment.

The config values are visible in the deployed page source (they are not secret — see Auth model) but are absent from the git history.

## Prototype properties

These are known limitations to address before treating this as production-grade.

- **No offline support.** Firebase Realtime Database has offline capabilities, but they are not configured. The app requires a connection to function.
- **No error boundaries.** Failed Firebase writes show a toast but do not retry or queue.
- **No pagination.** All records render in one pass. Acceptable for small groups over a reasonable time horizon.
## Production requirements

- Firebase project with Google Authentication enabled.
- Firebase Realtime Database with rules requiring `auth != null` for read and write.
- GitHub Pages hosting (repo can be public, no sensitive data in source).
- All participants have a Google account (personal Gmail or Google Workspace).
- No personally identifiable information beyond what Google provides (display name, photo URL) is stored.

## File structure

```
index.html                        ← HTML shell (structure + modals)
styles.css                        ← all CSS
js/app.js                         ← entry point, renderAll, window bindings, boot
js/state.js                       ← shared state (auth, db, currentUser, state object)
js/firebase.js                    ← Firebase config, init, auth state listener, subscriptions
js/auth.js                        ← sign-in/out, screen switching
js/utils.js                       ← helpers (esc, avatar, fmtDate, trashIcon, etc.)
js/render-events.js               ← events tab rendering
js/render-dishes.js               ← dishes tab rendering, voting
js/actions.js                     ← modals, save/delete actions, toast
.github/workflows/deploy.yml      ← GitHub Actions deploy workflow
README.md                         ← user-facing setup guide
CLAUDE.md                         ← this file
```
