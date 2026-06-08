# chatbot-platform — NX Monorepo

White-label, multi-tenant AI chatbot platform with seamless human hand-off.

## Workspace Structure

```
chatbot-platform/
├── apps/
│   ├── backend/        # NestJS API + Socket.io Gateway (port 3000)
│   ├── worker/         # BullMQ Background Jobs (Node.js)
│   ├── frontend/       # Next.js Admin & Agent Workspace (port 3001)
│   ├── widget/         # Svelte + Vite Web Component (port 3002)
│   └── ai-service/     # FastAPI RAG & LLM Orchestration (port 8000)
├── libs/
│   └── shared/         # @chatbot-platform/shared — TS types, constants, events
├── docker/             # Postgres init SQL, Docker helpers
├── scripts/            # Workspace-wide scripts
├── nx.json             # NX workspace config
├── package.json        # Root workspace package.json
└── tsconfig.base.json  # Shared TypeScript base
```

## Getting Started

### Prerequisites
- Node.js 22+
- Docker & Docker Compose
- npm 10+

### Install Dependencies
```bash
npm install
```

### Start Infrastructure (Postgres, Redis)
```bash
docker compose up postgres redis -d
```

### Run All Services (Local Dev, without Docker)
```bash
# All apps in parallel
npm run dev

# Individual apps
npm run dev:backend    # NestJS on :3000
npm run dev:worker     # BullMQ worker
npm run dev:frontend   # Next.js on :3001
npm run dev:widget     # Vite/Svelte on :3002
```

### Run via Docker Compose (Full Stack)
```bash
docker compose up
# or with live reload:
docker compose watch
```

## NX Commands

```bash
# Project dependency graph
npx nx graph

# Build all apps
npx nx run-many -t build

# Build only affected apps (from git diff)
npx nx affected -t build

# Test all
npx nx run-many -t test

# Lint all
npx nx run-many -t lint

# Run a specific app target
npx nx serve backend
npx nx build frontend
npx nx db:studio backend
npx nx db:migrate backend
```

## Shared Library

The `@chatbot-platform/shared` library (`libs/shared/`) is available in all TS apps:

```typescript
import {
  SOCKET_EVENTS,
  QUEUE_NAMES,
  ERROR_CODES,
  type Tenant,
  type ChatMessage,
  type JwtPayload,
} from '@chatbot-platform/shared';
```

## Clean Legacy Directories

The old `backend/` directory (at root) may have Docker-owned files that require:
```bash
sudo rm -rf backend/
```
