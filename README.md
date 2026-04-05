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
  - Required behavior comments when behavior is Fair/Needs Improvement
  - Distractions observed
  - Commands practiced
  - General notes
- Shows training history with date-range filtering.
- Includes a collapsible (default-open) History map for sessions with GPS coordinates.
- Clusters nearby map sessions for readability.
- Color-codes map markers by behavior rating.
- Supports optional sequence path overlay and heatmap mode.
- Heatmap intensity is normalized relative to currently visible mapped sessions.
- Adds map-only quick filters (behavior, dog, trainer, location type) and a fit-to-visible action.
- Notes how many sessions are excluded from the map when GPS coordinates are missing.
- Adds a Reporting tab (available to all users) with access-restricted analytics.
- Supports in-app editing of existing training entries for owners/admins.
- Generates copy/paste biweekly summaries.
- Exports CSV for trainer and admin workflows.
- Provides admin tools for:
  - All training data dashboard and CSV export
  - User role management (user/admin) with trainer access controls
  - Trainer deactivation/reactivation with `Active only` / `All users` filter and status counts
  - Litter registration
  - Dog-to-trainer assignment
  - Dog rename and propagation across assignments/history
  - Duplicate event detection with one-click resolution for duplicate assignment/entry/dog records
  - Trainer metadata warnings (missing name, suspicious phone format)
  - Trend charts: behavior over time, command coverage, and dog progress trajectory
- Includes an easter egg mini-game (Bone Hunt) hidden behind the icon beside the "Service Puppy Tracker" title.

## Tech stack

- Frontend: vanilla HTML/CSS/JavaScript (single `index.html`)
- Mapping: Leaflet + OpenStreetMap tiles (History tab)
- Mapping helpers: Leaflet MarkerCluster + Leaflet.heat
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
  - Log in as an admin user.
  - Use `Admin Guide` in the top-right of the app header.

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

## Trainer deactivation behavior

- Deactivation in-app does two things:
  - Removes all `dog_assignments` for that trainer email.
  - Sets `users/{uid}.disabled = true`.
- Disabled trainers are blocked at login by the app auth gate.
- Existing `entries` are retained for history and reporting.

## Easter egg: Bone Hunt

- Trigger: click the icon beside the `Service Puppy Tracker` title.
- Goal: move the dog across tiles and dig up hidden bones before the timer expires.
- Controls:
  - Desktop: arrow keys or `WASD` to move, `Space`/`Enter` to dig.
  - Mobile: on-screen directional controls + Dig button.

## Notes

- This app is intentionally implemented in one file for easy deployment.
- If you split code later, move Firebase config and business logic into separate modules.
