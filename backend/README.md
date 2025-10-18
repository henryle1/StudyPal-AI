# StudyPal AI Backend Template

This folder contains a lightweight Express scaffold. Each route currently returns placeholder responses so you can plug in database logic, authentication, and AI integrations later.

## Scripts

```bash
npm install     # install dependencies
npm run dev     # start in watch mode with nodemon
npm start       # run once in production mode
```

## Next Steps

- Replace `src/db/index.js` with a real database connector.
- Run `src/db/schema.sql` against your PostgreSQL database as a starting point.
- Implement authentication flow inside `src/routes/auth.js` and `src/middleware/auth.js`.
- Flesh out task CRUD in `src/routes/tasks.js`.
- Connect an AI provider in `src/routes/ai.js`.
- Expand analytics in `src/routes/stats.js`.
