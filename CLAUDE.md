# Kochabend — Claude Code Context

## What this application is

Kochabend is a single-page web app for a small private group to organise weekly cooking evenings. It runs entirely in the browser with no custom backend. Auth and data storage are handled by Firebase. The app is hosted on GitHub Pages. The entire app is a single `index.html` file with no build step.

## Tech stack

- Vanilla HTML, CSS, JavaScript. No framework, no bundler, no npm.
- Firebase 10 (ESM via CDN): Authentication, Realtime Database.
- Google Sign-In via Firebase Auth (popup flow).
- Google Fonts: Cormorant Garamond (headings), Nunito (body).
- No `data/` folder. No GitHub API. All persistence is Firebase.

## Firebase data model

All data lives in Firebase Realtime Database under three top-level keys.

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
| `approvedDishId` | string \| null | push ID of the approved dish |
| `createdBy` | string | uid of creator |

**`/dishes/{pushId}`**

A dish suggestion or history entry.

| field | type | description |
|---|---|---|
| `name` | string | dish name |
| `status` | enum | `suggested`, `approved`, `cooked`, `discarded` |
| `recipeUrl` | string | link to recipe, may be empty |
| `recipeText` | string | pasted recipe text, may be empty |
| `eventId` | string \| null | push ID of assigned event |
| `votes` | `{ [uid]: true }` | Firebase presence map of voters |
| `suggestedBy` | string | uid of suggester |

Firebase presence maps (`{ uid: true }`) are used instead of arrays to avoid index conflicts on concurrent writes.

## Auth model

Google Sign-In via Firebase popup. All users who can sign in with any Google account can access the app. Access restriction (if needed in future) would be implemented via Firebase database rules checking a whitelist. Currently the rules require only `auth != null`.

Firebase config values (API key, auth domain, database URL, project ID) are stored in `localStorage` under `kochabend_firebase_cfg`. They are not secret — Firebase API keys identify the project, they do not grant access. Auth is enforced server-side by Firebase rules.

## Application state

State is held in a module-level `state` object: `{ events: {}, dishes: {}, users: {} }`. All three nodes are subscribed via `onValue` listeners that fire on any change. Each listener updates the relevant key and calls `renderAll()`. There is no local mutation. All writes go directly to Firebase and trigger re-renders via the subscription.

## Views

- **Next Evening** — shows the next upcoming event (date >= today), its approved dish, recipe, and RSVP list with real Google profile photos. RSVP writes to `events/{id}/attendees/{uid}`.
- **Vote** — lists all dishes with status `suggested` or `approved`, sorted by vote count. Each user can toggle their vote. Vote writes to `dishes/{id}/votes/{uid}`.
- **History** — lists all past events (date < today) in reverse chronological order with dish, recipe, and attendee photos.
- **Manage** — create events, suggest dishes, change dish status, assign dishes to events, set the approved dish per event. No separate auth gate since Firebase handles it.

## Setup flow

On first load, if no Firebase config is found in `localStorage`, a setup modal appears asking for the four Firebase config values. On subsequent loads, the config is read from `localStorage` and Firebase is initialised immediately.

## Prototype properties

These are known limitations to address before treating this as production-grade.

- **Open registration.** Any Google account can sign in. There is no invite or allowlist mechanism. This is acceptable for a closed friend group using a non-publicised URL, but is not formally enforced.
- **No offline support.** Firebase Realtime Database has offline capabilities, but they are not configured. The app requires a connection to function.
- **No error boundaries.** Failed Firebase writes show a toast but do not retry or queue.
- **No pagination.** All records render in one pass. Acceptable for small groups over a reasonable time horizon.
- **Config in localStorage.** The Firebase config is not sensitive, but a compromised device exposes the project identity. Not a meaningful attack surface given Firebase rules require auth.

## Production requirements

- Firebase project with Google Authentication enabled.
- Firebase Realtime Database with rules requiring `auth != null` for read and write.
- GitHub Pages hosting (repo can be public, no sensitive data in source).
- All participants have a Google account (personal Gmail or Google Workspace).
- No personally identifiable information beyond what Google provides (display name, photo URL) is stored.

## File structure

```
index.html    ← entire app
README.md     ← user-facing setup guide
CLAUDE.md     ← this file
```
