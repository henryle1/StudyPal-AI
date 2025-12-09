# StudyPal AI Frontend Template

React 19 application scaffolded with React Router, ready for you to plug in authentication, task management, AI planning, and analytics features.

## Available Scripts

```bash
npm run dev      # start the dev server (http://localhost:5173)
npm run build    # production build output to dist/
npm run preview  # serve the production build locally
npm run lint     # run ESLint
```

## Key Files

- `src/pages/*` – placeholder pages aligned with the backlog (Dashboard, Tasks, Planner, Analytics, Settings, Auth screens).
- `src/layouts/DashboardLayout.jsx` – shell containing sidebar + header; injects page content via `<Outlet />`.
- `src/context/AuthContext.jsx` – minimal auth state; replace with real logic once backend is ready.
- `src/components/PlaceholderCard.jsx` – drop-in component used as a reminder of what to build next.

Adjust styling, add state management, or integrate UI libraries as your project evolves.
