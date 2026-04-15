Health Intelligence Agent
An AI-powered personal health tracking agent that detects patterns in your daily health data.
Stack

Frontend: React + Vite + Recharts + TailwindCSS
Backend: Node.js + Express + Prisma
Database: PostgreSQL (Docker locally, Neon in production)
AI: Groq API (llama-3.3-70b-versatile)

Quick Start
Prerequisites

Node.js 20+
Docker & Docker Compose
Groq API key (free at console.groq.com)

1. Start the database
bashdocker-compose up -d
2. Setup the server
bashcd server
npm install
cp .env.example .env        # then fill in your values
npx prisma migrate dev --name init
npx prisma db seed
npm run dev
3. Setup the client
bashcd client
npm install
npm run dev

Frontend: http://localhost:5173
Backend:  http://localhost:3001

Project Structure
health-agent/
├── client/          # React frontend
├── server/          # Node.js backend
│   ├── prisma/      # Schema + migrations + seed
│   └── src/
│       ├── routes/      # Express route handlers
│       ├── agent/       # AI agent core + tools
│       ├── services/    # Analytics + scheduler
│       └── middleware/  # Auth + error handling
└── docker-compose.yml