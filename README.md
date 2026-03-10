# Study Orbit

A bilingual (English/Bangla) AI-powered academic study platform built with React, Express, and PostgreSQL.

## Features

- Session-based authentication with OTP login and password reset
- Onboarding flow with academic profile setup
- Subject and topic management
- Study planner with date-based scheduling
- Pomodoro focus timer with session tracking
- Multi-mode AI assistant with streaming responses (SSE)
- Floating AI chat widget accessible from every page
- Progress dashboard with charts and analytics
- Friend system with real-time chat (WebSocket)
- Profile picture upload
- Local backup and restore (IndexedDB)
- Dark mode support
- Bilingual UI (English and Bangla)

## Tech Stack

- **Frontend:** React 18, Tailwind CSS 3, shadcn/ui, Framer Motion, Recharts, Wouter
- **Backend:** Express 5, Node.js, TypeScript
- **Database:** PostgreSQL with Drizzle ORM
- **AI:** OpenAI GPT-4o / GPT-4o-mini
- **Real-time:** WebSocket (ws)

## Prerequisites

- Node.js 20+
- PostgreSQL 14+
- An OpenAI API key

## Local Development Setup

1. **Clone the repository:**

   ```bash
   git clone https://github.com/your-username/study-orbit.git
   cd study-orbit
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Set up environment variables:**

   ```bash
   cp .env.example .env
   ```

   Open `.env` and fill in the required values:

   | Variable | Required | Description |
   |----------|----------|-------------|
   | `DATABASE_URL` | Yes | PostgreSQL connection string (e.g. `postgresql://user:pass@localhost:5432/studyorbit`) |
   | `SESSION_SECRET` | Yes | A random string for session encryption. Generate one with `openssl rand -hex 32` |
   | `OPENAI_API_KEY` | Yes | Your OpenAI API key from [platform.openai.com](https://platform.openai.com/api-keys) |
   | `PORT` | No | Server port (default: `5000`) |
   | `NODE_ENV` | No | `development` or `production` |

4. **Create the database:**

   ```bash
   createdb studyorbit
   ```

5. **Push the schema to the database:**

   ```bash
   npm run db:push
   ```

6. **Start the development server:**

   ```bash
   npm run dev
   ```

   The app will be available at [http://localhost:5000](http://localhost:5000).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with Vite HMR |
| `npm run build` | Build for production (client + server) |
| `npm start` | Start the production server |
| `npm run check` | Run TypeScript type checking |
| `npm run db:push` | Push schema changes to the database |

## Production Deployment

### Build and Run

```bash
npm run build
npm start
```

The build step compiles the React frontend with Vite and bundles the Express server with esbuild into `dist/index.cjs`. The production server serves the static frontend and API from a single process on the configured port.

### Deploy to a VPS or Cloud VM

1. Clone the repo and install dependencies on your server
2. Set up PostgreSQL and create the database
3. Configure environment variables (`.env` or your hosting provider's secret manager)
4. Run `npm run db:push` to set up the database schema
5. Run `npm run build` to create the production bundle
6. Run `npm start` to launch the server (use a process manager like PM2 for production)

```bash
# Example with PM2
npm install -g pm2
npm run build
pm2 start dist/index.cjs --name study-orbit
```

### Deploy to Railway / Render / Fly.io

1. Connect your GitHub repository
2. Set the build command to `npm run build`
3. Set the start command to `npm start`
4. Add environment variables (`DATABASE_URL`, `SESSION_SECRET`, `OPENAI_API_KEY`)
5. The platform will handle the rest

## Project Structure

```
study-orbit/
  client/               # React frontend
    src/
      components/       # UI components (shadcn/ui + custom)
      hooks/            # Custom React hooks
      lib/              # Auth, i18n, theme, utilities
      pages/            # Page components (14 pages)
    index.html          # HTML entry point
  server/               # Express backend
    index.ts            # Server entry point
    routes.ts           # All API routes
    storage.ts          # Database operations (Drizzle ORM)
    auth.ts             # Authentication (bcrypt + sessions)
    ai-providers.ts     # OpenAI integration with streaming
    websocket.ts        # WebSocket server for real-time chat
    db.ts               # Database connection pool
    vite.ts             # Vite dev middleware (dev only)
    static.ts           # Static file serving (prod only)
  shared/               # Shared between frontend and backend
    schema.ts           # Drizzle schema + Zod validators
    models/             # Additional data models
  script/
    build.ts            # Production build script
  .env.example          # Template for environment variables
  drizzle.config.ts     # Drizzle Kit configuration
  tailwind.config.ts    # Tailwind CSS configuration
  tsconfig.json         # TypeScript configuration
  vite.config.ts        # Vite configuration
```

## License

MIT
