# Clean Madurai – Smart Civic Sanitation Portal

A full-stack Vite + React application that allows Madurai citizens to report sanitation issues, and empowers ward officers and administrators to triage and resolve complaints. The stack now uses Firebase (Auth, Cloud Firestore, Storage) plus Google Maps for geo-tagged submissions alongside a simple rule-based AI verifier.

## Tech Stack

- Vite + React 19 with React Router 7
- Firebase Authentication + Cloud Firestore + Firebase Storage
- Google Maps JavaScript API
- Custom CSS styled after a civic/government portal

## Getting Started

1. **Install dependencies**

	```bash
	npm install
	```

2. **Create a `.env` file** in the project root with your Firebase + Maps credentials:

	```bash
	VITE_FIREBASE_API_KEY=<firebase-web-api-key>
	VITE_FIREBASE_AUTH_DOMAIN=<firebase-auth-domain>
	VITE_FIREBASE_PROJECT_ID=<firebase-project-id>
	VITE_FIREBASE_STORAGE_BUCKET=<firebase-storage-bucket>
	VITE_FIREBASE_MESSAGING_SENDER_ID=<firebase-messaging-sender-id>
	VITE_FIREBASE_APP_ID=<firebase-app-id>
	VITE_GOOGLE_MAPS_KEY=<browser-google-maps-api-key>
	```

3. **Configure Firebase**

   - Enable **Email/Password** under *Authentication → Sign-in method*.
   - In **Cloud Firestore**, create two collections:
     - `users/{uid}` → `{ name, phone, ward, address, email, role, createdAt }`
     - `complaints/{autoId}` → `{ userId, category, description, imageUrl, latitude, longitude, ward, status, aiVerified, createdAt }`
   - Apply temporary hackathon rules (open access) and remember to lock them down post-demo:

	   ```
	   rules_version = '2';
	   service cloud.firestore {
	     match /databases/{database}/documents {
	       match /{document=**} {
	         allow read, write: if true;
	       }
	     }
	   }
	   ```

   - In **Storage**, keep the default bucket and upload policies, then set hackathon rules:

	   ```
	   rules_version = '2';
	   service firebase.storage {
	     match /b/{bucket}/o {
	       match /{allPaths=**} {
	         allow read, write: if true;
	       }
	     }
	   }
	   ```

4. **Run the dev server**

	```bash
	npm run dev
	```

5. **Build for production**

	```bash
	npm run build
	npm run preview
	```

## Core Features

- **Role-based authentication** (user, officer, admin) powered by Firebase Auth and Firestore user profiles with localStorage session persistence.
- **Citizen dashboard** summarizing total, pending, and resolved complaints with quick access to report forms.
- **Complaint reporting** with category selection, textual description, Firebase Storage image upload, Google Maps marker selection, and AI keyword validation (`garbage`, `waste`, `sewage`, `drain`).
- **Officer console** filtered by ward, enabling workflow actions and deep dives into each complaint.
- **Admin overview** aggregating all complaints city-wide with KPI cards and quick drill-down.
- **Complaint detail view** showing metadata, evidence imagery, static map, and buttons for marking cases `In Progress` or `Resolved` (officer/admin only).

## Testing Notes

- Seed `users` and `complaints` documents via the Firebase Console or scripted imports for demo data.
- Ensure the Google Maps key has the Maps JavaScript API enabled and is authorized for your dev origin.
- Run `npm run lint` if you add new code paths.

The app is hackathon-ready: configure Firebase + Maps keys, deploy the permissive rules for the demo (then tighten them afterward), and launch `npm run dev` to showcase the experience.
