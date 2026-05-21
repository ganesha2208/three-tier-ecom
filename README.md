# ShopForge — Production-Grade E-Commerce (React + FastAPI + PostgreSQL)

[![CI](https://github.com/ganesha2208/three-tier-ecom/actions/workflows/ci.yml/badge.svg)](https://github.com/ganesha2208/three-tier-ecom/actions/workflows/ci.yml)
[![CD](https://github.com/ganesha2208/three-tier-ecom/actions/workflows/cd.yml/badge.svg)](https://github.com/ganesha2208/three-tier-ecom/actions/workflows/cd.yml)

A full-featured, three-tier e-commerce application built with senior-engineering
practices: layered architecture, typed APIs, JWT auth with refresh tokens,
PostgreSQL with Alembic migrations, optimistic UI, Stripe payments (with
graceful mock fallback), product reviews, wishlist, cart, orders, and an admin
console.

## Stack

| Tier        | Technology                                                       |
| ----------- | ---------------------------------------------------------------- |
| Frontend    | React 18 + TypeScript, Vite, TailwindCSS, Zustand, React Query, React Router |
| Backend     | Python 3.12, FastAPI, SQLAlchemy 2.x, Alembic, Pydantic v2, JWT  |
| Database    | PostgreSQL 16                                                    |
| Infra       | Docker Compose                                                   |
| Payments    | Stripe (optional, mock fallback)                                 |

## Features

**Customer**
- Browse products with category filter, search, sort, and pagination
- Product detail with image gallery, rating, and reviews
- Wishlist (persists per account)
- Cart (server-side, per account) with quantity updates and stock checks
- Checkout with address + Stripe payment (or mock for dev)
- Account: profile, addresses, order history with status tracking
- Auth: register / login / refresh / logout with httpOnly-style refresh

**Admin**
- Manage products (CRUD, stock, images, featured)
- Manage categories
- Manage orders (status transitions, view buyer & items)
- View customers

**Engineering quality**
- Layered backend (api → services → models)
- Pydantic schemas for all I/O
- Role-based access control (customer / admin)
- Alembic migrations
- Idempotent seed script (sample catalog + admin user)
- CORS, rate-limit-friendly, error handlers, health endpoints
- Typed frontend with React Query caching + Zustand state
- Reusable UI primitives (Button, Input, Modal, Toast)

## Quick start (Docker)

```bash
cp .env.example .env
docker compose up --build
```

Then open:
- Frontend: http://localhost:5173
- Backend API docs: http://localhost:8000/docs
- Default admin: `admin@example.com` / `Admin@12345`

## Local development (no Docker)

### Backend
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows PowerShell: .venv\Scripts\Activate.ps1
pip install -r requirements.txt
# point DATABASE_URL at a running postgres
$env:DATABASE_URL = "postgresql+psycopg2://ecom:ecom_pw@localhost:5432/ecom"
alembic upgrade head
python -m app.scripts.seed
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Project layout

```
.
├── backend/
│   ├── app/
│   │   ├── api/v1/endpoints/   # HTTP handlers
│   │   ├── core/               # config, db, security
│   │   ├── models/             # SQLAlchemy models
│   │   ├── schemas/            # Pydantic I/O
│   │   ├── services/           # business logic
│   │   └── scripts/seed.py     # idempotent demo data
│   └── alembic/                # migrations
└── frontend/
    └── src/
        ├── api/                # typed API client
        ├── components/         # UI primitives + feature components
        ├── pages/              # route screens
        ├── store/              # zustand stores
        └── types/
```

## Notes on payments

If `STRIPE_SECRET_KEY` and `VITE_STRIPE_PUBLISHABLE_KEY` are set, real Stripe
PaymentIntents are used. If not, the app falls back to a deterministic mock
payment so the full checkout flow remains demoable end-to-end.
