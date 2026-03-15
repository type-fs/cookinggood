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
| `ingredients` | string | ingredients list, may be empty |
| `eventId` | string \| null | push ID of assigned event |
| `votes` | `{ [uid]: true }` | Firebase presence map of voters |
| `suggestedBy` | string | uid of suggester |

Firebase presence maps (`{ uid: true }`) are used instead of arrays to avoid index conflicts on concurrent writes.

## Auth model

Google Sign-In via Firebase popup. After successful sign-in, the app checks `/allowedUsers/{uid}` in the Realtime Database. If the UID is not present, the user is signed out immediately and shown a "not on the guest list" message. This is enforced client-side on every auth state change. For full server-side enforcement, Firebase database rules should also check that `auth.uid` exists in `/allowedUsers`.

The Firebase config is hardcoded as `FIREBASE_CFG` in the script block and is intentionally public. Firebase API keys only identify the project — they do not grant access. All authorization is enforced server-side by Firebase Authentication and database rules.

## Application state

State is held in a module-level `state` object: `{ events: {}, dishes: {}, users: {} }`. All three nodes are subscribed via `onValue` listeners that fire on any change. Each listener updates the relevant key and calls `renderAll()`. There is no local mutation. All writes go directly to Firebase and trigger re-renders via the subscription.

## Views

- **Events** — lists all cooking events. Upcoming events show date, approved dish, attendees, and RSVP join/leave buttons. Past events are hidden under an expandable "Past events" section. An "Add Event" button at the top opens a modal with a date picker.
- **Dishes** — lists all dishes grouped by status. Suggested/approved dishes appear first with voting (sorted by vote count). Cooked dishes appear next. Discarded dishes are hidden under an expandable section. A "Suggest Dish" button at the top opens a modal for name, recipe link, ingredients, and recipe text.

## Setup flow

The Firebase config is hardcoded in the script block. On load, Firebase is initialised immediately and the user sees the Google Sign-In screen.

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
index.html    ← entire app
README.md     ← user-facing setup guide
CLAUDE.md     ← this file
```
