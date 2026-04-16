# Health Intelligence Agent

An AI-powered personal health tracking app that detects delayed, longitudinal patterns in your daily data.

## Stack
- Frontend: React + Vite + Recharts
- Backend: Node.js + Express + Prisma
- Database: PostgreSQL (Docker)
- AI: Groq (`llama-3.3-70b-versatile` by default)

## Prerequisites
- Node.js 20+
- Docker Desktop running
- Groq API key (optional but recommended for richer weekly reports)

## One-Time Setup
1. Copy env files:
```powershell
Copy-Item server/.env.example server/.env
Copy-Item client/.env.example client/.env
```
2. Fill values in `server/.env` (`JWT_SECRET`, optional `GROQ_API_KEY`).
3. Start PostgreSQL:
```powershell
docker-compose up -d
```
4. Install dependencies:
```powershell
cd server; npm install
cd ..\client; npm install
```

## Start The App
1. Run DB migration + seed (server terminal):
```powershell
cd server
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```
2. Run frontend (second terminal):
```powershell
cd client
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3001

## Demo Login (Seeded)
After `npm run db:seed`, use:
- Email: `demo@healthagent.dev`
- Password: `demo-password-123`

This seeded account includes 28 days of deterministic data with:
- A 2-day delayed relationship between sleep and focus
- Mood improvements on consecutive exercise days

## First Output (Fastest Path)
1. Open http://localhost:5173
2. Login with demo credentials above
3. Set window to `30 days`
4. Click `Generate Weekly Report`
5. You should now see:
- Trend chart (mood/focus/energy)
- Lagged pattern findings
- Narrative weekly insight report

## Test With Your Own Inputs
1. Register a new account in the UI.
2. Add at least 7 daily logs from the `Daily Log` card.
3. Click `Generate Weekly Report`.
4. Increase reliability by logging 14-30 days.

## Sample Data Payloads
Use `docs/sample-logs.json` as reference payloads for API or manual entry.

Example API flow (PowerShell):
```powershell
# register
$register = Invoke-RestMethod -Method POST -Uri "http://localhost:3001/api/auth/register" -ContentType "application/json" -Body '{"email":"you@example.com","password":"password123","name":"You"}'
$token = $register.token

# add one log
Invoke-RestMethod -Method POST -Uri "http://localhost:3001/api/logs" -Headers @{ Authorization = "Bearer $token" } -ContentType "application/json" -Body '{"date":"2026-04-16","sleepHours":7.8,"mood":8,"energy":8,"focus":7,"waterLiters":2.2,"exerciseMinutes":35,"symptoms":[],"foodNotes":"Balanced meals","notes":"Felt good"}'

# generate weekly report
Invoke-RestMethod -Method POST -Uri "http://localhost:3001/api/insights/weekly?days=30" -Headers @{ Authorization = "Bearer $token" }
```

## Helpful Commands
```powershell
# server
npm run dev
npm run db:migrate
npm run db:seed
npm run db:studio

# client
npm run dev
```

## Troubleshooting
- `Can't reach database server at localhost:5432`:
  - Ensure Docker Desktop is running.
  - Re-run `docker-compose up -d`.
- Weekly report fallback mode:
  - If `GROQ_API_KEY` is empty, app still works with local fallback narrative.
