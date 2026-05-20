# Phase 0 Concept Brief — App Hardening

> **Read this before any code changes.** Time: ~15 min.
> **Goal:** Get the monolith to a bug-free baseline so we don't slice broken code into 5 broken services in Phase 1.

---

## Why this phase exists

Phase 1 extracts microservices out of the current monolith. If the monolith has a stock-race bug, every extracted order-service will inherit that bug. If `SECRET_KEY` has a default, every extracted service will share that anti-pattern. We fix it once here, then propagate the correct patterns into the service templates.

This phase is also where you build the **defensible interview answers** for the security/reliability questions a senior DevOps interview always asks: *"how do you handle secrets?"*, *"how do you prevent race conditions?"*, *"what's in your prod Docker image?"*

---

## What we're fixing (9 items)

Each item is structured as:
- **What's broken** — the actual bug in the current code (with file:line)
- **Why it matters** — what happens in production if we don't fix it
- **The fix** — high-level approach (code follows in the implementation step)
- **Interview talking point** — what this unlocks for you

---

### 1. Frontend Dockerfile runs the dev server in "prod"

**What's broken:** `frontend/Dockerfile:12` runs `npm run dev` — that's the Vite dev server. The "production" image also contains all of `node_modules` (~400 MB), source code, source maps, and zero security hardening.

**Why it matters:**
- Dev servers are slow, single-threaded, and not built for traffic
- Image is ~10× larger than it should be → slow pulls during pod restarts (real cost on K8s)
- Source maps + readable JS leak code structure to attackers
- Hot-reload watcher consumes CPU forever

**The fix:** Multi-stage Docker build.
- **Stage 1 (`builder`)**: `node:20-alpine`, runs `npm ci && npm run build` to produce `/app/dist`
- **Stage 2 (`runtime`)**: `nginx:alpine`, copies only `dist/` from stage 1, serves on port 80 with a minimal `nginx.conf` (gzip, SPA fallback to `index.html`)
- Final image: ~25 MB, no Node, no source

**Interview talking point:** *"My production frontend image is 25 MB — just nginx and the built static bundle. No Node runtime, no source code, no node_modules. Pulls in under a second, smaller attack surface."*

---

### 2. `SECRET_KEY` has a default value

**What's broken:** `backend/app/core/config.py:23` — `SECRET_KEY: str = Field(default="dev-secret-change-me")`.

**Why it matters:** This is the key that signs JWTs. If anyone forgets to set the env var in production, the app boots silently with a public, googleable secret. Anyone on the internet can forge admin JWTs.

**The fix:** Remove the default. Add a Pydantic validator that fails-fast at startup if `SECRET_KEY` is unset *or* equals the dev sentinel. The app refuses to start.

**Interview talking point:** *"Fail-fast configuration — if a critical secret isn't explicitly provided, the app crashes at boot instead of running with a publicly known default. This converts a silent vulnerability into a loud deployment failure that gets caught in the CI/CD pipeline."*

---

### 3. Stock decrement is not transactional (race condition)

**What's broken:** `backend/app/services/order_service.py:30-35` checks `item.product.stock < item.quantity`, then line 74 does `p.stock -= item.quantity`. The comment on line 29 admits the issue. Two concurrent checkouts can both pass the check and both decrement → overselling.

**Why it matters:**
- In a multi-worker deployment (any production deployment) this WILL happen during traffic spikes
- Overselling means refunds, angry customers, manual order fulfilment
- Classic textbook race condition — interviewers love to probe this

**The fix:** Use PostgreSQL **row-level locking** via `SELECT ... FOR UPDATE`. Before any stock check or decrement, the order-service issues `SELECT id, stock FROM products WHERE id IN (...) FOR UPDATE`. Postgres locks those rows for the transaction. A second concurrent transaction waits until the first commits or rolls back.

We'll lock rows in a deterministic order (sorted by product_id) to avoid deadlocks if two carts share products in different orders.

**Interview talking point:** *"Order checkout had a TOCTOU race — time-of-check vs time-of-use on stock levels. I fixed it with pessimistic row-level locking: `SELECT ... FOR UPDATE` orders the locking deterministically by product_id to avoid deadlocks. Alternative was optimistic concurrency with a version column — I chose pessimistic because checkout traffic is bursty and retries on optimistic failure cause cascade load."*

That answer alone is senior-engineer signal.

---

### 4. OpenAPI docs always exposed

**What's broken:** `backend/app/main.py:18-20` always serves `/docs`, `/redoc`, and `/openapi.json`. In production this leaks the entire API schema (endpoints, fields, validation rules) to anyone on the internet.

**Why it matters:** Attackers don't have to guess your API — you hand them a complete map. They can craft malicious payloads with full knowledge of your validation logic.

**The fix:** Add an `ENVIRONMENT` setting (default `"dev"`). When `ENVIRONMENT=prod`, set `docs_url=None`, `redoc_url=None`, `openapi_url=None`. Dev/staging keep them.

**Interview talking point:** *"OpenAPI docs are turned off in prod via an environment toggle — reduces attack surface and prevents the API contract from leaking to anyone unauthenticated."*

---

### 5. CORS falls back to `["*"]` with credentials

**What's broken:** `backend/app/main.py:25` — `allow_origins=settings.BACKEND_CORS_ORIGINS or ["*"]` combined with `allow_credentials=True`.

**Why it matters:** Browsers actually refuse `Access-Control-Allow-Origin: *` when credentials are allowed, so this *happens* not to leak today. But the **intent** is wrong, and any future framework upgrade or middleware order change could turn it into a real vulnerability. We want the config to be **safe by construction**, not by accident.

**The fix:** Pydantic validator on `BACKEND_CORS_ORIGINS` that rejects empty lists and `"*"` entries in prod. App refuses to start with unsafe CORS.

**Interview talking point:** *"CORS is one of the most common production misconfigurations. I made the config refuse to boot if origins aren't explicitly listed in prod — wildcards + credentials is a class of vulnerability that browsers protect against today but I don't want to depend on browser behaviour."*

---

### 6. Stripe payment intent has silent fallback to mock

**What's broken:** `backend/app/services/order_service.py:124-127` — when real Stripe is configured but a Stripe call throws, the code silently falls back to a mock payment intent. So if Stripe is having an outage, customers think they paid (with `mock_pi_*` IDs) and never actually do.

**Why it matters:** Free product giveaway during any Stripe outage. The `# Fall back gracefully so checkout still works in dev` comment is a footgun — fine in dev, catastrophic in prod.

**The fix:** Branch on `ENVIRONMENT`. In dev, fall back to mock (preserves the existing demo flow). In prod, let the Stripe exception propagate up as a 502, surface a real error to the customer, and fail the order.

**Interview talking point:** *"Silent fallbacks are dangerous — they convert visible failures (5xx errors) into invisible ones (everyone thinks they paid, no one did). I scoped the mock-payment fallback to non-prod environments and made prod fail loudly."*

---

### 7. Missing `/ready` endpoint (only `/health` exists)

**What's broken:** `backend/app/main.py:48-50` exposes `/health` which just returns `{"status": "ok"}`. There's no separation between **liveness** (the process is alive) and **readiness** (the process can serve traffic).

**Why it matters:** K8s needs both. They mean different things:
- **Liveness probe** failing → "kill this pod and restart it" (process is wedged)
- **Readiness probe** failing → "stop sending it traffic but leave it running" (DB connection broken, queue full, warming up)

If you use one endpoint for both, a transient DB blip restarts your pod (because liveness fails), which is much worse than just temporarily removing it from the load balancer.

**The fix:**
- `/health` (liveness) — `200 OK`, no dependencies checked. Just "the Python process is running."
- `/ready` (readiness) — checks DB connection (`SELECT 1`). Returns `503` if DB unreachable.

**Interview talking point:** *"Separating liveness from readiness is a K8s anti-pattern fix many junior services miss. Liveness is 'is the process alive' — no dependency checks. Readiness is 'can it serve traffic right now' — checks DB. A transient DB blip should remove a pod from the load balancer, not restart it."*

---

### 8. Logging is unstructured, no correlation IDs

**What's broken:** `backend/app/main.py:13` uses Python's default `logging.basicConfig` with a string format. No JSON, no request ID, no way to correlate logs across a single request.

**Why it matters:** When you have 5 microservices and a request fans across all of them, you need a `trace_id` (or `request_id`) to follow it through logs. Without that, debugging a slow checkout requires manually correlating timestamps across 5 services — impossible at scale.

This is foundation work for Phase 6 (observability) — but adding it now means every microservice we extract in Phase 1 inherits the right pattern from day 1.

**The fix:** Three things:
- Replace stdlib logging with `structlog` configured for JSON output
- Add a FastAPI middleware that:
  - Reads `X-Request-ID` header if present, generates a UUID otherwise
  - Binds it to the structlog context for the duration of the request
  - Echoes it back in the response header
- Every log line now has `{"event": "...", "request_id": "...", "level": "..."}` JSON shape

**Interview talking point:** *"Every log line is JSON with a request_id that flows through HTTP headers between services. In Phase 6 I extended this with OpenTelemetry to propagate trace_id across HTTP and SQS — but the foundation was here, in the monolith, before any service split. The pattern was right from day one."*

---

### 9. No idempotency on `POST /orders/checkout`

**What's broken:** `backend/app/api/v1/endpoints/orders.py:22` — if a user double-clicks "Place Order" or their browser retries on flaky wifi, they get charged twice. The endpoint has no idempotency mechanism.

**Why it matters:**
- Duplicate orders = duplicate charges = chargebacks
- In a microservices setup it's worse: a network blip between order-service and payment-service can trigger retry on the order-service side, creating 2 orders
- Stripe specifically recommends using their `Idempotency-Key` header for this reason

**The fix:**
- Add an `Idempotency-Key` HTTP header on `POST /checkout`
- Add an `idempotency_keys` table: `(user_id, key, order_id, response_json, created_at)`. Unique constraint on `(user_id, key)`
- Middleware-style logic in the checkout handler:
  - If the user has used this key before → return the saved response
  - Otherwise → process the order, save (key, response) before commit

This pattern is **exactly what Stripe, Square, and every serious payments API uses**. Showing it in a portfolio = strong signal.

**Interview talking point:** *"Checkout is idempotent — same `Idempotency-Key` returns the same response, no duplicate charges. The key is scoped per user and stored in a dedicated table so we can retry safely from any client (browser retry, mobile flaky network, gateway timeout). Pattern modeled on Stripe's own idempotency API."*

---

## What's NOT in scope for Phase 0

To keep this phase tight (1-2 days) we explicitly defer:

- **Multi-stage backend Dockerfile** → Phase 2 (Container excellence, where we also add distroless + cosign signing + SBOM)
- **Rate limiting on auth endpoints** → Phase 4 (handled at WAF + Istio gateway layer, not in app code)
- **Httponly cookies for JWT refresh** → out of scope (defensible to keep localStorage + document the tradeoff)
- **Address deduplication** → product polish, not a security/reliability blocker
- **Cart merge on login** → product polish, defer

If we try to fix everything now, Phase 0 takes a week and we lose momentum. The 9 items above are the ones that **break the project** if not fixed.

---

## Order of operations

We'll fix in this order so each change is testable independently:

1. **Config hardening** (items #2, #4, #5) — adds `ENVIRONMENT` setting, fail-fast validators, removes `SECRET_KEY` default. Tested by trying to boot the app with bad config — it should refuse.
2. **Logging foundation** (item #8) — structlog + request-ID middleware. Tested by hitting any endpoint and seeing JSON logs with request_id.
3. **Liveness/readiness split** (item #7) — add `/ready` endpoint. Tested by stopping postgres and seeing `/health` stay 200 while `/ready` returns 503.
4. **Frontend Dockerfile** (item #1) — multi-stage build. Tested by `docker build && docker run` and curling the served bundle.
5. **Stock race fix** (item #3) — `SELECT FOR UPDATE`. Tested by a concurrency test (we'll add a pytest that spawns 10 parallel checkouts and asserts no oversell).
6. **Stripe fallback fix** (item #6) — env-scoped fallback. Tested by mocking a Stripe error in `ENV=prod` and asserting 502.
7. **Idempotency key** (item #9) — new table + checkout middleware. Tested by replaying the same request with the same key and asserting one order, same response.

We commit after each step so the diff stays readable.

---

## Time estimate

**1–2 days of focused work.** Items 1-4 are each ~15-30 min. Items 5-7 are each ~1 hour with tests.

---

## What you should feel after reading this

If you don't feel comfortable explaining **why** each fix matters (not just what the fix is), tell me which items to expand. The interview value of this project depends on you being able to defend every line.

---

## Next step

Read this, then say one of:
- **"go"** — start implementing in the order above
- **"expand item N"** — I'll write a deeper dive on that specific item
- **"reorder X before Y"** — change the implementation order
- **"add/remove item Z"** — change scope
