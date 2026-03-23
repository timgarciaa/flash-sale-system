# High-Throughput Flash Sale System

---

## Getting Started

### Prerequisites

- Docker + Docker Compose
- Node.js 18+
- [pnpm](https://pnpm.io/installation) — the repo pins `pnpm@10.30.0` in the root `package.json`. With Corepack enabled (`corepack enable`), `pnpm install` from the repo root uses that version.

### Running locally

1. **Start infrastructure**

```bash
docker-compose up -d
docker-compose ps
```

2. **Install dependencies** (repository root)

```bash
pnpm install
```

3. **Configure the backend**

```bash
cp packages/backend/.env.example packages/backend/.env
```

Edit `packages/backend/.env` and set your sale window and stock, for example:

```env
SALE_START=2026-03-18T14:00:00.000Z
SALE_END=2026-03-18T15:00:00.000Z
SALE_STOCK=100
```

4. **Seed the database**

```bash
pnpm seed
```

This ensures `sales` and `purchases` tables exist, inserts a sale from your env vars, truncates existing rows, and initializes the Redis stock counter.

5. **Start the app**

```bash
pnpm dev
```

- API: http://localhost:3000
- Web UI: http://localhost:5173 (Vite proxies `/api` to the backend)

To run only one process: `pnpm dev:api` (backend) or `pnpm dev:web` (frontend).

### Root scripts

| Command                         | Purpose                                               |
| ------------------------------- | ----------------------------------------------------- |
| `pnpm dev`                      | API and web together                                  |
| `pnpm dev:api` / `pnpm dev:web` | Backend or frontend only                              |
| `pnpm build`                    | Build backend and frontend                            |
| `pnpm test`                     | Backend Jest suite                                    |
| `pnpm seed`                     | Seed DB and Redis (see step 4)                        |
| `pnpm migrate`                  | Run DB migrations only (backend)                      |
| `pnpm reset`                    | Truncate purchases and reset Redis counters (backend) |
| `pnpm stress`                   | Simulate stress test with multiple users              |

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          Browser                                │
│                    React + Vite (port 5173)                     │
│                                                                 │
│   ┌─────────────────┐          ┌──────────────────────────┐    │
│   │   SaleStatus    │          │      PurchaseForm         │    │
│   │  - Live badge   │          │  - User ID input          │    │
│   │  - Countdown    │          │  - Buy Now button         │    │
│   │  - Stock bar    │          │  - Success/error feedback │    │
│   └─────────────────┘          └──────────────────────────┘    │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTP (proxied via Vite /api → :3000)
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Express API (port 3000)                      │
│                                                                 │
│   GET  /api/sale/status          → getSaleStatus()             │
│   POST /api/sale/purchase        → attemptPurchase()           │
│   GET  /api/sale/purchase/:uid   → getUserPurchase()           │
│                                                                 │
│              services/saleService.ts                           │
│         (validates timing, orchestrates Redis + DB)            │
└───────────────────┬─────────────────────────┬───────────────────┘
                    │                         │
         ┌──────────▼──────────┐   ┌──────────▼──────────┐
         │   Redis 7 (6379)    │   │  PostgreSQL 15 (5432)│
         │                     │   │                      │
         │  flash_sale:stock   │   │  sales table         │
         │  flash_sale:user:*  │   │  purchases table     │
         │                     │   │                      │
         │  Lua script handles │   │  Durable record of   │
         │  atomic decrement + │   │  every successful    │
         │  user dedup in one  │   │  purchase, with      │
         │  round-trip         │   │  UNIQUE constraint   │
         └─────────────────────┘   └──────────────────────┘
```

### Concurrency Flow

```
User A ──────────────────────────────────────────────────────► success
User B ─────────────────────────────────────────────────────► success
  ...  (100 concurrent requests, stock=100)
User 101 ──────────────────────────────────────────────────► out_of_stock
User 102 ──────────────────────────────────────────────────► out_of_stock
  ...
User 500 ──────────────────────────────────────────────────► out_of_stock

All requests hit the Redis Lua script simultaneously.
The Lua script is executed atomically — Redis processes
it as a single indivisible operation — so exactly 100
succeed regardless of concurrency.
```

---

## API Reference

| Method | Path                         | Description                   |
| ------ | ---------------------------- | ----------------------------- |
| `GET`  | `/health`                    | Health check                  |
| `GET`  | `/api/sale/status`           | Current sale status + stock   |
| `POST` | `/api/sale/purchase`         | Attempt purchase `{ userId }` |
| `GET`  | `/api/sale/purchase/:userId` | Look up a user's purchase     |

### Example

```bash
# Check status
curl http://localhost:3000/api/sale/status

# Attempt purchase
curl -X POST http://localhost:3000/api/sale/purchase \
  -H 'Content-Type: application/json' \
  -d '{"userId":"alice"}'
```

---

## Running Tests

Unit and integration tests use mocked Redis and PostgreSQL — no infrastructure required.

```bash
pnpm test
```

The test suite covers:

- `getSaleStatus()`: no sale, active, upcoming, ended, negative stock clamping
- `attemptPurchase()`: validation, timing guards, Redis result mapping, DB persistence, duplicate key handling
- `getUserPurchase()`: found, not found, invalid input
- API routes: all happy paths and error cases via supertest

---

## Running Stress Tests

The stress test fires 500 concurrent purchase requests against a running backend with stock set to 100. It asserts that **exactly 100 succeed** and the remaining 400 are correctly rejected.

### Steps

1. Start infrastructure (`docker-compose up -d`) and the API: `pnpm dev:api` (see [Run locally](#run-locally)).

2. In `packages/backend/.env`, set `SALE_STOCK=100` and a sale window that includes the current time (for example a wide `SALE_START` / `SALE_END` range), then run `pnpm seed`.

3. Run the stress test:

```bash
pnpm reset
pnpm stress
```

### Expected output

```
════════════════════════════════════════════════════════════
  FLASH SALE STRESS TEST
════════════════════════════════════════════════════════════
  Target:       http://localhost:3000
  Total users:  500
  Stock limit:  100
────────────────────────────────────────────────────────────

Firing all requests simultaneously...

════════════════════════════════════════════════════════════
  RESULTS
════════════════════════════════════════════════════════════
  Total requests:    500
  Wall-clock time:   ~800ms
  Avg latency:       ~250ms
  Min latency:       ~80ms
  Max latency:       ~750ms
────────────────────────────────────────────────────────────
  Successes:         100
  Already purchased: 0
  Out of stock:      400
  HTTP errors:       0
  Network errors:    0
────────────────────────────────────────────────────────────
  VERDICT: ✓ PASS
  Exactly 100 users purchased. Concurrency control works correctly.
════════════════════════════════════════════════════════════
```

---

## Design Decisions

### Redis Lua Script for Atomic Operations

The core concurrency problem: 500 users simultaneously attempt to purchase 100 items. Without atomicity, a naive `GET stock → check → DECR stock` sequence is a classic TOCTOU (time-of-check/time-of-use) race condition. Between the GET and DECR, another request can read the same stock value and both decrement — causing overselling.

The solution is a **Redis Lua script** that combines all three checks into a single atomic operation:

```lua
-- 1. Check if user already purchased → return 'already_purchased'
-- 2. Check if stock <= 0 → return 'out_of_stock'
-- 3. DECR stock + SET user key → return 'success'
```

Redis guarantees that Lua scripts are executed atomically — no other command can interleave. This means:

- Stock never goes below 0
- A user can never purchase more than once via the Redis layer
- No distributed locks or optimistic retry loops required

### PostgreSQL for Durable Persistence

Redis is an in-memory store. A server restart or Redis flush would lose all purchase history. PostgreSQL provides:

- **Durable, ACID-compliant storage** — purchases survive restarts
- **`UNIQUE` constraint on `user_id`** — a secondary safety net against duplicates, even if Redis state is ever lost
- **Audit trail** — timestamped purchase records for reporting and dispute resolution
- **Relational integrity** — purchases reference their sale via `sale_id` foreign key

The two-layer approach (Redis for speed + Lua atomicity, PostgreSQL for durability) gives the system both throughput and correctness.

### Why Not Distributed Locks (SETNX-based)?

Distributed locks (e.g., Redlock) introduce retry complexity, lock timeouts, and potential deadlocks. The Lua script approach is simpler, faster (single round-trip), and provably correct for this use case since all decision logic lives inside one atomic Redis command.

---

## Project Structure

```
flash-sale-system/
├── docker-compose.yml          # PostgreSQL + Redis services
├── package.json                # pnpm workspace root
├── README.md
└── packages/
    ├── backend/                # Express + TypeScript API
    │   ├── src/
    │   │   ├── config/         # Environment config loader
    │   │   ├── db/             # pg Pool, migrate, seed
    │   │   ├── redis/          # ioredis client + Lua atomicPurchase
    │   │   ├── services/       # Business logic
    │   │   ├── routes/         # Express routers
    │   │   ├── middleware/     # Error handler, 404
    │   │   ├── app.ts          # Express app setup
    │   │   └── index.ts        # Server entrypoint
    │   ├── stress/             # Concurrent purchase simulation
    │   └── src/tests/          # Unit + integration tests
    └── frontend/               # React + Vite UI
        └── src/
            ├── api/            # Fetch wrappers
            ├── components/     # SaleStatus, PurchaseForm
            ├── App.tsx         # Root component with auto-refresh
            └── main.tsx        # React entrypoint
```
