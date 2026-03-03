CleanNile

CleanNile is a civic reporting web application that enables citizens to report environmental issues such as pollution, waste dumping, and water contamination. Reports include photo evidence and geolocation, are reviewed by administrators, and approved reports are displayed on a public map.

The platform promotes transparency, accountability, and community-driven environmental monitoring.

Features
	•	User authentication (Firebase Authentication)
	•	Secure report submission with image upload
	•	Automatic geolocation capture
	•	Admin moderation (approve / reject workflow)
	•	Public interactive map (Google Maps API)
	•	User profile page with report history
	•	Real-time updates using Firestore listeners
	•	Backend validation via Next.js API routes
	•	Role-based access control with Firestore security rules


Tech Stack
	•	Next.js (App Router)
	•	TypeScript
	•	Firebase Authentication
	•	Cloud Firestore
	•	Firebase Storage
	•	Firebase Admin SDK
	•	Google Maps JavaScript API
	•	Vercel (deployment)


Architecture

The application follows a secure client–server architecture:
	•	Frontend → Next.js API Routes → Firestore
	•	Frontend → Firebase Storage (image upload)
	•	Backend validation using Zod
	•	Role-based authorization enforced via Firestore Rules

Only administrators can approve or reject reports. Only approved reports are visible on the public map.


Getting Started

1. Clone the Repository

git clone https://github.com/yourusername/cleannile-app.git
cd cleannile-app

2. Install Dependencies

npm install

3. Configure Environment Variables

Create a .env.local file in the root directory:

NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=

FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

Do not commit this file to version control.

4. Run Development Server

npm run dev

Open:

http://localhost:3000



Deployment

The application is optimized for deployment on Vercel.
	1.	Push the repository to GitHub.
	2.	Import the project into Vercel.
	3.	Add environment variables in the Vercel dashboard.
	4.	Deploy.


Security
	•	Firestore security rules enforce role-based access.
	•	Backend API routes validate incoming data.
	•	Only administrators can modify report status.
	•	Sensitive credentials are stored in environment variables.


Future Improvements
	•	Email notifications on report approval
	•	Analytics dashboard
	•	Rate limiting
	•	Image moderation
	•	Mobile UI improvements


License

This project is licensed under the MIT License.


