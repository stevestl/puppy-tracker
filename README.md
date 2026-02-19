# Service Puppy Tracker

Service Puppy Tracker is a single-page web app for trainers and administrators to record and review public-access/service-dog training sessions.

## What the app does

- Supports trainer signup/login through Firebase Authentication.
- Restricts account access to users with an assigned dog.
- Lets trainers log field training sessions with:
  - Location capture (GPS + reverse geocoding support)
  - Location type
  - Duration
  - Behavior rating
  - Distractions observed
  - Commands practiced
  - Notes
- Shows training history with date-range filtering.
- Generates copy/paste biweekly summaries.
- Exports CSV for trainer and admin workflows.
- Provides admin tools for:
  - Litter registration
  - Dog-to-trainer assignment
  - Global reporting and CSV export
- Includes an easter egg mini-game (Bone Hunt) hidden behind the icon left of "Select Dog".

## Tech stack

- Frontend: vanilla HTML/CSS/JavaScript (single `index.html`)
- Backend: Firebase
  - Authentication
  - Firestore
  - App Check (reCAPTCHA v3)
- Hosting-ready for Firebase Hosting

## Repository layout

- `/Users/Steve2/GitHub/puppy-tracker/index.html`: App UI and logic.
- `/Users/Steve2/GitHub/puppy-tracker/firestore.rules`: Firestore security rules.
- `/Users/Steve2/GitHub/puppy-tracker/firebase.json`: Firebase hosting config.
- `/Users/Steve2/GitHub/puppy-tracker/assets/`: App images and icons.

## Setup

1. Install Firebase CLI if needed.
2. Authenticate with your Firebase account:
   - `firebase login`
3. Confirm project config in `index.html` (`firebaseConfig` block).
4. Deploy/firewall rules as needed:
   - `firebase deploy --only firestore:rules`
   - `firebase deploy --only hosting`

## Data model (Firestore)

- `users/{uid}`
  - `name`, `email`, `role`, `createdAt`
- `dogs/{dogId}`
  - `dogName`, `motherName`, `litterName`, timestamps
- `dog_assignments/{assignmentId}`
  - `trainerEmail`, `dogName`, timestamps
- `entries/{entryId}`
  - Session payload (timestamp, dogName, trainer/user, location, behavior, duration, notes, tags)

## Role behavior

- Trainer/User:
  - Must have at least one assigned dog to access the app.
  - Can log entries for assigned dogs.
  - Can view/export their relevant data.
- Admin:
  - Has all trainer capabilities.
  - Gets Admin tab access.
  - Can register litters, assign dogs, and export broader reports.

## In-app documentation

The app now includes built-in guides:

- User documentation:
  - Open `Settings` tab.
  - Use `Open User Documentation`.
- Admin documentation (admin-only):
  - Open `Admin` tab.
  - Use `Open Admin Documentation`.

## Firebase admin management notes

- Promote a user to admin:
  - In Firestore, open `users/{uid}` and set `role` to `admin` (string).
  - User must sign out/sign in again for role refresh.
- Litter maintenance:
  - Prefer entering a full litter in one pass from the app.
  - If litter entries are partial or spelling corrections are needed later, updates may require direct Firestore edits.
  - Dog name spelling fixes usually require creating a corrected dog record and updating related `dog_assignments` and `entries`.
- Deleting records not supported in app:
  - Export CSV first for backup.
  - Remove related assignment records before deleting dog records.
  - Manually delete affected docs in Firestore collections (`entries`, `dog_assignments`, `dogs`, `users`) as needed.

## Easter egg: Bone Hunt

- Trigger: click the icon to the left of `Select Dog`.
- Goal: move the dog across tiles and dig up hidden bones before the timer expires.
- Controls:
  - Desktop: arrow keys or `WASD` to move, `Space`/`Enter` to dig.
  - Mobile: on-screen directional controls + Dig button.

## Notes

- This app is intentionally implemented in one file for easy deployment.
- If you split code later, move Firebase config and business logic into separate modules.
