# Study Orbit

Study Orbit is a bilingual (English and Bangla) academic study platform built for students who want structured planning, calmer focus sessions, AI-assisted learning help, and clearer progress tracking in one place.

## Stack

- Frontend: React 18, Wouter, React Query, Tailwind CSS, shadcn/ui, Framer Motion
- Backend: Express 5, Node.js, TypeScript
- Database: PostgreSQL with Drizzle ORM
- Realtime: WebSocket chat
- AI: OpenAI-backed provider routing

## Requirements

- Node.js 20+
- npm 10+
- PostgreSQL 14+ or Docker Desktop

## Environment Variables

Copy [C:\Study_Orbit\.env.example](C:\Study_Orbit\.env.example) to `.env` and set:

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `SESSION_SECRET` | Yes | Session signing secret |
| `OPENAI_API_KEY` | Yes for AI features | OpenAI API key |
| `PORT` | No | Server port, defaults to `5000` |
| `NODE_ENV` | No | `development` or `production` |

Example local database URL:

```env
DATABASE_URL=postgresql://studyorbit:studyorbit@localhost:5432/studyorbit
```

## Windows PowerShell Local Development

1. Clone the repository:

```powershell
git clone https://github.com/syedratul-i2p/Study-Orbit.git
Set-Location Study-Orbit
```

2. Install dependencies:

```powershell
npm install
```

3. Create your local env file:

```powershell
Copy-Item .env.example .env
```

4. Start PostgreSQL.

If you already run PostgreSQL locally, use that and set `DATABASE_URL` accordingly.

If you want a local containerized database, use the included [C:\Study_Orbit\compose.yaml](C:\Study_Orbit\compose.yaml):

```powershell
docker compose up -d
```

5. Push the schema:

```powershell
npm run db:push
```

6. Start the development server:

```powershell
npm run dev
```

Expected local URL:

- App: [http://localhost:5000](http://localhost:5000)
- Health check: [http://localhost:5000/health](http://localhost:5000/health)

## Local Production-Style Run

After your `.env` is configured and the database is available:

```powershell
npm run build
npm start
```

Expected local URL:

- App: [http://localhost:5000](http://localhost:5000)
- Health check: [http://localhost:5000/health](http://localhost:5000/health)

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Express app with Vite middleware in development |
| `npm run build` | Build the client and bundle the server |
| `npm start` | Run the production bundle |
| `npm run check` | Run TypeScript type checking |
| `npm run db:push` | Push the Drizzle schema to PostgreSQL |

## Render Deployment

This repository now includes a Blueprint at [C:\Study_Orbit\render.yaml](C:\Study_Orbit\render.yaml).

### What the Blueprint config does

- Builds with `npm install && npm run build`
- Runs `npm run db:push` before deploy
- Starts the app with `npm start`
- Uses `/health` for Render health checks
- Generates `SESSION_SECRET`
- Expects `DATABASE_URL` and `OPENAI_API_KEY` to be supplied securely in Render

### Deploy on Render

1. Push the latest `main` branch to GitHub.
2. In Render, choose Blueprint deploy for this repository.
3. Confirm the detected service from [C:\Study_Orbit\render.yaml](C:\Study_Orbit\render.yaml).
4. Supply or confirm:
   - `DATABASE_URL`
   - `OPENAI_API_KEY`
5. Let Render generate `SESSION_SECRET`.
6. Deploy.

If you prefer not to use Blueprint sync, create a Node web service manually with:

- Build command: `npm install && npm run build`
- Pre-deploy command: `npm run db:push`
- Start command: `npm start`
- Health check path: `/health`

## Project Structure

```text
Study-Orbit/
  client/
    src/
      components/
      hooks/
      lib/
      pages/
  server/
    ai-providers.ts
    auth.ts
    db.ts
    index.ts
    routes.ts
    static.ts
    storage.ts
    vite.ts
    websocket.ts
  shared/
    schema.ts
    models/
  script/
    build.ts
  compose.yaml
  drizzle.config.ts
  render.yaml
  tailwind.config.ts
  tsconfig.json
  vite.config.ts
```

## Notes

- The app requires PostgreSQL. It will not boot without `DATABASE_URL`.
- AI features require `OPENAI_API_KEY`, but non-AI routes can still boot without using those features.
- `.env`, `dist`, `node_modules`, and `.codex-artifacts` are not tracked.
