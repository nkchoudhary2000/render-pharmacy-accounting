# PharmaLedger - Pharmacy Accounting & Management Web Application

An end-to-end, production-ready full-stack Pharmacy Accounting & Clinical Management System built with **FastAPI**, **SQLAlchemy 2.0 (Async)**, **PostgreSQL (Neon DB)**, and **React (Vite + TypeScript + Tailwind CSS)**. Configured for zero-downtime deployment on **Render.com**.

---

## Key Features

1. **Modern Pharmacy Theme (Teal/Mint & Coral/Crimson)**:
   - Mint & Teal (`#0d9488`, `#10b981`) convey clinical health, stability, and trust.
   - Coral & Crimson (`#f43f5e`, `#ef4444`) provide clear visual contrast for alerts, low stock indicators, and emergency actions.
2. **Instant Inline Editing**:
   - Modern data grid where users can click any cell (name, price, stock, expiry date, status) and hit **Enter** or **blur** to trigger a real-time `PATCH` request to the database without reloading the page.
3. **Authentication & Seamless Account Merging (JWT + Google OAuth)**:
   - Email/password authentication and Google OAuth.
   - **Account Merging**: If a user signs in via Google with an existing local email (or vice versa), the system automatically merges and links the account without throwing duplicate email errors.
   - **First-User Admin Initialization**: On initial deployment, the very first registered user automatically acquires the `ADMIN` role. Subsequent registrations default to `STAFF`.
4. **Interactive PDF Generation ("Print to PDF")**:
   - High-fidelity, vector-crisp printable documents with `@media print` layout:
     - **Prescriptions (Rx)**: Official physician prescription slip with Rx symbol, medication regimens, dosing, instructions, and doctor signature block.
     - **Invoices & Bills**: Formal tax invoice with itemized charges, payment status, and totals.
     - **Patient Profiles**: Full medical history, allergies, past appointments, and billing records.
     - **Doctor Profiles**: Specialization, medical license, and scheduled consultations roster.
5. **Database Backup & Disaster Recovery (Admin Only)**:
   - 1-Click database backup export (`/api/admin/backup`) downloading a complete JSON snapshot of all tables.
   - Transactional restore endpoint (`/api/admin/restore`) enabling upload and recovery of database state.
6. **User Profile & Dynamic Currency (`/profile`)**:
   - Customizable full name, `@username` handle, profile picture upload/external URL/medical avatar presets.
   - Global currency preference (`$`, `€`, `£`, `₹`, `CA$`, `A$`, `¥`, or custom) updating real-time across invoices, inventory, and stats.
   - Smart password security: supports setting a password for Google OAuth users without prompting for a non-existent current password.
7. **Selective Database Wipe with Interactive Checklist (Admin Only)**:
   - Dynamic per-table row counts with safety confirmation modal requiring typing `"WIPE"`.
   - Relational dependency deletion order to prevent foreign key errors.
   - Permanent protection of Administrator accounts against deletion.
8. **High-Performance Architecture & Response Compression**:
   - In-memory JWT user authentication caching (`~1.6ms` resolution, 0 DB roundtrips).
   - Unified `/api/dashboard/summary` loader eliminating request waterfalls.
   - GZip compression middleware and debounced, flicker-free UI data tables.
9. **API Documentation & Swagger UI**:
   - Fully documented OpenAPI tags, schemas, and description available at `/docs` (Swagger UI) and `/redoc` with interactive JWT Bearer authorization lock.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | FastAPI, Python 3.11, Pydantic v2 |
| **ORM & Driver** | SQLAlchemy 2.0 (Async), asyncpg (PostgreSQL), aiosqlite (fallback) |
| **Database** | PostgreSQL hosted on Neon DB (SSL enabled) |
| **Authentication** | JWT (python-jose), Passlib (bcrypt), Google OAuth ID Token |
| **Frontend** | React 18, Vite, TypeScript |
| **Styling** | Tailwind CSS (Custom Mint/Teal & Coral/Crimson palette) |
| **State & Fetching** | TanStack React Query v5, Axios |
| **Routing** | React Router DOM v6 |
| **Deployment** | Render.com (`render.yaml` Infrastructure as Code) |

---

## Database Schema

```
Users           (id, email, password_hash, role [ADMIN/STAFF], auth_provider [LOCAL/GOOGLE], created_at)
Patients        (id, name, age, gender, contact, medical_history, created_at)
Doctors         (id, name, specialization, contact, license_number)
Medicines       (id, name, batch_number, expiry_date, stock_quantity, price, location)
Appointments    (id, patient_id, doctor_id, appointment_date, status, notes)
Prescriptions   (id, patient_id, doctor_id, details [JSON], date)
Billing         (id, patient_id, total_amount, payment_status [PAID/PENDING/REFUNDED], date)
```

---

## Running Locally

### 1. Prerequisites
- Python 3.11+
- Node.js 18+ and npm

### 2. Backend Setup
```bash
# Navigate to project root
cd render_pharmacy_accounting

# Install backend dependencies
python -m pip install -r backend/requirements.txt

# (Optional) Set your Neon DB connection string in backend/.env:
# DATABASE_URL=postgresql+asyncpg://neondb_owner:password@ep-xyz.us-east-2.aws.neon.tech/neondb?ssl=require
# If left unset, it automatically uses local SQLite: sqlite+aiosqlite:///./pharmacy.db

# Run FastAPI backend server on port 8001
uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8001
```
Backend Swagger documentation is live at: `http://127.0.0.1:8001/docs`.

### 3. Frontend Setup
```bash
# Navigate to frontend folder
cd frontend

# Install frontend dependencies
npm install

# Start Vite development server
npm run dev
```
Frontend web application is live at: `http://localhost:5173`.

### 4. Default Demo Accounts
The database automatically seeds realistic sample clinical & accounting data on initial launch:
- **Lead Administrator**:
  - Email: `admin@pharmacy.com`
  - Password: `Admin123!`
- **Pharmacy Staff**:
  - Email: `pharmacist@pharmacy.com`
  - Password: `Staff123!`

---

## Deployment to Render.com

This repository includes a production-ready `render.yaml` file (Infrastructure as Code).

### Deploying via GitHub / Render Blueprint:
1. Push this repository to GitHub.
2. In the [Render Dashboard](https://dashboard.render.com), click **New +** -> **Blueprint**.
3. Connect your repository. Render will automatically read `render.yaml` and create:
   - `pharmacy-backend` (FastAPI Web Service)
   - `pharmacy-frontend` (React Static Site with SPA rewrites)
4. Under `pharmacy-backend` environment settings, set `DATABASE_URL` to your Neon PostgreSQL connection string:
   ```
   postgresql+asyncpg://<username>:<password>@<neon-host>/<database>?ssl=require
   ```
5. Click **Apply** to deploy!
