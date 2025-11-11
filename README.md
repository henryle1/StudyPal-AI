# StudyPal AI Template

This repository provides a starter scaffold that mirrors the deliverables outlined in `todo_list.md`. Each part of the stack returns placeholder data so you can plug in real implementations at your own pace.

## Structure

- `backend/` – Express server with modular route placeholders for auth, tasks, AI plans, and analytics.
- `frontend/` – React 19 + React Router application with basic layouts, auth screens, and dashboard placeholders.
- `todo_list.md` – Phase-based checklist you can update as milestones are completed.

## Getting Started

### Backend Setup

```bash
cd backend
npm install

# Create .env file with your database credentials and port
cat > .env << EOF
PGHOST=localhost
PGPORT=5432
PGDATABASE=studypal
PGUSER=postgres
PGPASSWORD=your_postgres_password

PORT=5001
JWT_SECRET=your-secret-key-change-this-in-production
JWT_EXPIRES_IN=7d
EOF

# Initialize database tables
node src/db/init.js

# Start the server
npm run dev
```

### Frontend Setup

```bash
cd frontend
npm install

# Create .env file with backend API URL
cat > .env << EOF
VITE_API_URL=http://localhost:5001
EOF

# Start the dev server
npm run dev
```

The backend listens on `http://localhost:5001` by default, while the frontend runs on `http://localhost:5173`.

**Note**: Each developer can customize their port by changing `PORT` in `backend/.env` and `VITE_API_URL` in `frontend/.env`.

## Where to Implement Next

- Swap placeholder responses in `backend/src/routes/*` with real controllers and database integrations.
- Wire the frontend pages (e.g., `src/pages/Tasks.jsx`, `src/pages/AIPlanner.jsx`) to axios/fetch calls hitting the new endpoints.
- Replace the mock auth context with JWT-aware logic once `/api/auth/login` and `/api/auth/register` are functional.
- Enrich UI components with charts, tables, and forms that match your design vision.

Feel free to tailor the structure, rename files, or introduce additional tooling (Prisma, Tailwind, Zustand, etc.) as you build the full StudyPal AI experience.
