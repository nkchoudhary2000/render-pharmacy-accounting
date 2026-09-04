# Firebase Google Login Portal for PharmaLedger

This guide explains how to build and deploy a standalone Firebase-hosted Google Login web app that authenticates users with Google and seamlessly redirects them into PharmaLedger.

---

## Architecture Overview

1. **User opens Firebase app** (e.g., `https://pharmacy-auth-portal.web.app`).
2. **User clicks "Sign in with Google"**: Firebase Authentication triggers Google OAuth popup (`signInWithPopup`).
3. **Firebase returns ID token**: The Firebase app obtains the Google or Firebase JWT `idToken`.
4. **Token Exchange**: The Firebase app calls PharmaLedger's backend:
   ```http
   POST https://<your-render-backend-url>/api/auth/google
   Content-Type: application/json

   {
     "credential": "<idToken>",
     "source": "firebase"
   }
   ```
5. **Backend Processing**:
   - Backend verifies token signature.
   - Sets user account source to `"firebase"` and sets `auth_provider = "LOCAL"`.
   - Returns `{ "access_token": "<jwt>", "requires_password_setup": true, "user": { ... } }`.
6. **Seamless Redirect**:
   - The Firebase app redirects the user to:
     ```
     https://<your-render-frontend-url>/?token=<access_token>&setup_password=true
     ```
7. **Password Setup Modal**:
   - PharmaLedger detects the query parameters, logs the user in, cleans the URL bar, and presents the **Set Account Password** modal.
   - User enters a new password.
   - Once saved, the account is converted into a standard local user account. The user can now log into PharmaLedger directly with their email and password!

---

## Turnkey Firebase Project Files

Below are the complete, ready-to-deploy files for your Firebase project.

### 1. `firebase.json`
```json
{
  "hosting": {
    "public": "public",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

### 2. `public/index.html`
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>PharmaLedger - External Google Authentication Portal</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
    }
    body {
      min-height: 100vh;
      background: radial-gradient(circle at top left, #0f172a, #090d16 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
      color: #f8fafc;
    }
    .card {
      max-width: 440px;
      width: 100%;
      background: rgba(30, 41, 59, 0.7);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 24px;
      padding: 2.5rem 2rem;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      text-align: center;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      background: rgba(13, 148, 136, 0.2);
      border: 1px solid rgba(13, 148, 136, 0.4);
      color: #5eead4;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-radius: 9999px;
      margin-bottom: 1.25rem;
    }
    .logo {
      width: 60px;
      height: 60px;
      background: linear-gradient(135deg, #0d9488, #2dd4bf);
      border-radius: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1.25rem;
      box-shadow: 0 10px 25px rgba(13, 148, 136, 0.4);
    }
    .logo svg {
      width: 32px;
      height: 32px;
      fill: none;
      stroke: white;
      stroke-width: 2.2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    h1 {
      font-size: 1.6rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      margin-bottom: 0.5rem;
    }
    p.desc {
      font-size: 0.85rem;
      color: #94a3b8;
      line-height: 1.5;
      margin-bottom: 2rem;
    }
    .btn-google {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      background: #ffffff;
      color: #1e293b;
      font-weight: 600;
      font-size: 0.95rem;
      padding: 0.85rem 1.25rem;
      border: none;
      border-radius: 14px;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
      transition: all 0.2s ease;
    }
    .btn-google:hover {
      background: #f1f5f9;
      transform: translateY(-1px);
    }
    .btn-google:active {
      transform: translateY(0);
    }
    .btn-google:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }
    .status {
      margin-top: 1.5rem;
      padding: 0.75rem 1rem;
      border-radius: 12px;
      font-size: 0.8rem;
      display: none;
    }
    .status.info {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      background: rgba(14, 165, 233, 0.15);
      border: 1px solid rgba(14, 165, 233, 0.3);
      color: #7dd3fc;
    }
    .status.error {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      background: rgba(244, 63, 94, 0.15);
      border: 1px solid rgba(244, 63, 94, 0.3);
      color: #fda4af;
    }
    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid currentColor;
      border-top-color: transparent;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  </style>

  <!-- Firebase Modular SDK Scripts via CDN -->
  <script type="module" src="app.js"></script>
</head>
<body>
  <div class="card">
    <div class="logo">
      <svg viewBox="0 0 24 24">
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
        <path d="M12 5v14"/>
        <path d="M5 12h14"/>
      </svg>
    </div>

    <span class="badge">Firebase Authentication</span>
    <h1>Sign In to PharmaLedger</h1>
    <p class="desc">Authenticate with your Google workspace or personal account to access the pharmacy system.</p>

    <button id="googleBtn" class="btn-google">
      <svg width="18" height="18" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
      </svg>
      <span>Continue with Google</span>
    </button>

    <div id="statusBox" class="status"></div>
  </div>
</body>
</html>
```

### 3. `public/app.js`
```javascript
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// 1. REPLACE WITH YOUR FIREBASE PROJECT CONFIG
const firebaseConfig = {
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// 2. PHARMALEDGER APP URLS
// For local testing:
// const BACKEND_URL = "http://127.0.0.1:8001";
// const PHARMACY_WEB_URL = "http://localhost:5173";

// For production on Render:
const BACKEND_URL = "https://render-pharmacy-accounting-1.onrender.com";
const PHARMACY_WEB_URL = "https://render-pharmacy-accounting-1.onrender.com"; // or your frontend domain

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
provider.addScope('email');
provider.addScope('profile');

const googleBtn = document.getElementById('googleBtn');
const statusBox = document.getElementById('statusBox');

function showStatus(message, type = 'info', hasSpinner = false) {
  statusBox.className = `status ${type}`;
  statusBox.innerHTML = hasSpinner 
    ? `<div class="spinner"></div> <span>${message}</span>` 
    : `<span>${message}</span>`;
  statusBox.style.display = 'flex';
}

googleBtn.addEventListener('click', async () => {
  try {
    googleBtn.disabled = true;
    showStatus('Opening Google Sign-In...', 'info', true);

    // 1. Sign in with Google Popup
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    
    // 2. Retrieve Firebase ID Token (JWT)
    const idToken = await user.getIdToken();
    showStatus('Authenticating with PharmaLedger backend...', 'info', true);

    // 3. Exchange token with PharmaLedger Backend
    const response = await fetch(`${BACKEND_URL}/api/auth/google`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        credential: idToken,
        source: 'firebase'
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.detail || `Authentication failed: ${response.statusText}`);
    }

    const data = await response.json();
    const token = data.access_token;
    // Only request password setup if user does not already have a password set
    const requiresSetup = Boolean(data.requires_password_setup) && !data.user?.has_password;

    showStatus('Login approved! Redirecting to PharmaLedger...', 'info', true);

    // 4. Redirect to PharmaLedger Web App with token & setup_password trigger
    const targetUrl = new URL(PHARMACY_WEB_URL);
    targetUrl.searchParams.set('token', token);
    if (requiresSetup) {
      targetUrl.searchParams.set('setup_password', 'true');
    }
    targetUrl.searchParams.set('source', 'firebase');

    setTimeout(() => {
      window.location.href = targetUrl.toString();
    }, 800);

  } catch (error) {
    console.error('Login error:', error);
    showStatus(error.message || 'Failed to sign in with Google.', 'error', false);
    googleBtn.disabled = false;
  }
});
```

---

## Deployment Instructions

1. Install Firebase CLI (if not already installed):
   ```bash
   npm install -g firebase-tools
   ```
2. Log into Firebase:
   ```bash
   firebase login
   ```
3. Initialize hosting inside your project directory:
   ```bash
   firebase init hosting
   ```
   - Select your Firebase Project.
   - Specify `public` as your public directory.
   - Configure as single-page app: `Yes`.
4. Replace `public/index.html` and `public/app.js` with the code above.
5. Deploy:
   ```bash
   firebase deploy --only hosting
   ```

---

## Turnkey AI Prompt for Firebase Hosting Login App

Copy and paste this prompt into an AI assistant whenever you want to generate or modify this Firebase login app from scratch:

```text
Build a modern, production-ready Firebase Hosting web application that serves as an external Google Authentication portal for my pharmacy management system (PharmaLedger).

Here are the requirements:
1. Technology:
   - Vanilla HTML5, CSS3, and modern JavaScript (ES Modules).
   - Firebase SDK v10 (modular) via official CDN (firebase-app.js, firebase-auth.js).
   - Hosted on Firebase Hosting (include firebase.json and public/ folder).

2. UI & Aesthetics:
   - Modern dark-themed dashboard with glassmorphism (slate-900 background, blurred translucent card, subtle borders).
   - Medical/pharmacy icon with teal accent gradient (#0d9488 to #2dd4bf).
   - "External Authentication Portal" pill badge.
   - Clean "Continue with Google" button with official multi-color Google 'G' SVG icon.
   - Interactive loading spinner state and error message alert box.

3. Authentication Workflow:
   - When the user clicks "Continue with Google", execute signInWithPopup(auth, provider) using GoogleAuthProvider.
   - Extract the user's ID token using user.getIdToken().
   - Make a POST request to the PharmaLedger backend:
       URL: https://<BACKEND_URL>/api/auth/google
       Headers: { "Content-Type": "application/json" }
       Body: JSON.stringify({ credential: idToken, source: "firebase" })
   - The backend validates the token, marks source as "firebase", and returns:
       { access_token: "...", token_type: "bearer", user: { ... }, requires_password_setup: true }
   - Redirect the user to the PharmaLedger Web App:
       https://<PHARMACY_WEB_URL>/?token=<access_token>&setup_password=true&source=firebase
   - Display a brief "Login approved! Redirecting..." animation before redirecting.

4. Deliverables:
   - public/index.html
   - public/app.js (with placeholder for Firebase config and target URLs)
   - firebase.json
   - Step-by-step terminal commands to test locally with 'firebase serve' and deploy with 'firebase deploy --only hosting'.
```
