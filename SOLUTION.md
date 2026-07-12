# TransitOps — Solution Document

**Odoo Hackathon · 8-hour build · 4 developers**

This file is the single source of truth for the team. Everyone builds against
this document so nobody's code conflicts with anyone else's. Commit this file
to the repo root **before writing any code**.



---

## 1. Problem

Logistics companies still run their fleets on spreadsheets and paper
logbooks. That causes five recurring failures:

1. **Double-booking** — the same vehicle or driver gets assigned to two trips
   at once because there's no shared source of truth.
2. **Underutilized vehicles** — nobody can see at a glance which vehicles are
   sitting idle.
3. **Missed maintenance** — servicing gets skipped because nobody is tracking
   it centrally, and a vehicle with an open issue can get dispatched anyway.
4. **Compliance risk** — drivers get sent out with expired licenses because
   nobody's checking at the point of dispatch.
5. **No cost visibility** — nobody can say what a single vehicle costs to run
   (fuel + maintenance) or whether it's actually profitable, until someone
   manually reconciles spreadsheets weeks later.

## 2. Solution

TransitOps is a centralized platform that digitizes the full transport
operations lifecycle — vehicle registration → driver management → dispatch →
maintenance → fuel/expense tracking → reporting — and makes the five failures
above **structurally impossible** rather than relying on manual discipline.

The core idea: **every status change happens automatically as a side effect
of a real action**, never as a manual dropdown edit.

- Dispatching a trip automatically checks cargo weight vs. capacity, driver
  license validity, and availability — then flips both vehicle and driver to
  `On Trip`.
- Completing or cancelling a trip automatically reverts both to `Available`.
- Opening a maintenance record automatically pulls the vehicle out of the
  dispatch pool (`In Shop`); closing it automatically restores availability.
- Every fuel log and expense automatically rolls up into per-vehicle cost,
  efficiency, and ROI — visible live on a dashboard, not reconciled later.

### Example walkthrough (this is also your demo script)

1. Register vehicle `Van-05`, max capacity 500 kg, status `Available`.
2. Register driver `Alex`, valid license, status `Available`.
3. Create a trip: cargo weight 450 kg. System checks 450 ≤ 500 → allowed.
4. Dispatch → `Van-05` and `Alex` both flip to `On Trip` automatically.
5. Complete the trip, enter final odometer + fuel consumed → both flip back
   to `Available` automatically.
6. Log a maintenance record ("Oil Change") on `Van-05` → status becomes
   `In Shop` automatically, instantly hidden from the dispatch dropdown.
7. Close maintenance → `Van-05` reverts to `Available`.
8. Reports update operational cost and fuel efficiency immediately, pulled
   from the trip and fuel log just created — no manual entry.

## 3. Target users / roles

| Role | Responsibility |
|---|---|
| **Fleet Manager** | Registers/manages vehicles, oversees lifecycle and maintenance |
| **Driver** | Creates and dispatches trips, logs fuel/odometer on completion |
| **Safety Officer** | Monitors license validity and driver safety scores |
| **Financial Analyst** | Reviews fuel, maintenance costs, and profitability reports |

RBAC applies across the whole app — every route enforces which role(s) may
call it (defined per-module below).

---

## 4. Tech stack (locked — do not deviate without team sync)

Exact versions only. No `^` or `~` in `package.json`. Run `npm ci` in both
`backend/` and `frontend/`, never `npm install`, once `package-lock.json`
exists, to guarantee everyone gets identical dependency trees.

**Backend**

| Package | Version |
|---|---|
| express | 4.21.2 |
| typescript | 5.9.3 |
| prisma / @prisma/client | 5.22.0 |
| zod | 3.23.8 |
| jsonwebtoken | 9.0.3 |
| bcryptjs | 2.4.3 |
| cors | 2.8.5 |
| dotenv | 16.6.1 |
| cookie-parser | 1.4.7 |
| socket.io | 4.8.3 |
| tsx (dev) | 4.23.0 |

**Frontend**

| Package | Version |
|---|---|
| react / react-dom | 18.3.1 |
| react-router-dom | 6.30.4 |
| axios | 1.18.1 |
| socket.io-client | 4.8.3 |
| recharts | 2.15.4 |
| vite (dev) | 5.4.21 |
| @vitejs/plugin-react (dev) | 4.7.0 |
| tailwindcss (dev) | 3.4.19 |
| typescript (dev) | 5.9.3 |

**Database:** PostgreSQL via Prisma ORM.
**Auth:** JWT (httpOnly cookie) + bcrypt password hashing.
**Real-time:** Socket.IO — pushes status changes to the dashboard live.
**Validation:** every route validates its input with a Zod schema before
touching the database.

---

## 5. Repo structure — strict directory isolation

Each agent **only** touches their own directories. This is what makes 4
people working in parallel possible without constant merge conflicts.

```
transitops/
├── SOLUTION.md                      ← this file, read-only reference for all
├── .env.example
├── backend/
│   ├── prisma/
│   │   └── schema.prisma            ← shared contract, Section 6, edit only by agreement
│   └── src/
│       ├── config/                  ← shared, Agent A owns
│       ├── lib/                     ← shared (prisma client, socket instance), Agent A owns
│       ├── middleware/              ← shared (auth, error handler, validate), Agent A owns
│       ├── shared/types.ts          ← shared contract, Section 7, edit only by agreement
│       └── modules/
│           ├── auth/                ← AGENT A
│           ├── vehicles/            ← AGENT B
│           ├── drivers/             ← AGENT B
│           ├── trips/               ← AGENT C
│           ├── maintenance/         ← AGENT D
│           ├── fuel/                ← AGENT D
│           └── reports/             ← AGENT D
└── frontend/
    └── src/
        ├── shared/                  ← AGENT A (layout, auth context, api client, theme/dark mode)
        └── pages/
            ├── LoginPage.tsx        ← AGENT A
            ├── VehiclesPage.tsx     ← AGENT B
            ├── DriversPage.tsx      ← AGENT B
            ├── TripsPage.tsx        ← AGENT C
            ├── MaintenancePage.tsx  ← AGENT D
            ├── FuelPage.tsx         ← AGENT D
            ├── DashboardPage.tsx    ← AGENT D
            └── ReportsPage.tsx      ← AGENT D
```

**Rule:** if your work requires touching a file outside your zone (e.g. a
shared type), post it in the team channel first — don't silently edit it.

---

## 6. Database contract (Prisma schema)

This is the exact schema. Field names and enum values are final — every
agent's backend service and frontend type must match this precisely.

```prisma
enum Role {
  FLEET_MANAGER
  DRIVER
  SAFETY_OFFICER
  FINANCIAL_ANALYST
}

enum VehicleStatus {
  AVAILABLE
  ON_TRIP
  IN_SHOP
  RETIRED
}

enum DriverStatus {
  AVAILABLE
  ON_TRIP
  OFF_DUTY
  SUSPENDED
}

enum TripStatus {
  DRAFT
  DISPATCHED
  COMPLETED
  CANCELLED
}

enum MaintenanceStatus {
  OPEN
  CLOSED
}

enum ExpenseType {
  TOLL
  MAINTENANCE
  OTHER
}

model User {
  id           String   @id @default(uuid())
  email        String   @unique
  passwordHash String
  name         String
  role         Role
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

model Vehicle {
  id                  String        @id @default(uuid())
  registrationNumber  String        @unique
  name                String
  type                String
  maxLoadCapacityKg   Float
  odometerKm          Float         @default(0)
  acquisitionCost     Float
  status              VehicleStatus @default(AVAILABLE)
  region              String?
  createdAt           DateTime      @default(now())
  updatedAt           DateTime      @updatedAt
}

model Driver {
  id                String       @id @default(uuid())
  name              String
  licenseNumber     String       @unique
  licenseCategory   String
  licenseExpiryDate DateTime
  contactNumber     String
  safetyScore       Float        @default(100)
  status            DriverStatus @default(AVAILABLE)
  createdAt         DateTime     @default(now())
  updatedAt         DateTime     @updatedAt
}

model Trip {
  id                String     @id @default(uuid())
  source            String
  destination       String
  cargoWeightKg     Float
  plannedDistanceKm Float
  actualDistanceKm  Float?
  fuelConsumedLtr   Float?
  status            TripStatus @default(DRAFT)
  vehicleId         String
  driverId          String
  createdById       String
  dispatchedAt      DateTime?
  completedAt       DateTime?
  cancelledAt       DateTime?
  createdAt         DateTime   @default(now())
  updatedAt         DateTime   @updatedAt
}

model MaintenanceLog {
  id          String            @id @default(uuid())
  vehicleId   String
  description String
  cost        Float             @default(0)
  status      MaintenanceStatus @default(OPEN)
  openedAt    DateTime          @default(now())
  closedAt    DateTime?
}

model FuelLog {
  id        String   @id @default(uuid())
  vehicleId String
  tripId    String?
  liters    Float
  cost      Float
  date      DateTime @default(now())
}

model Expense {
  id        String      @id @default(uuid())
  vehicleId String
  type      ExpenseType
  amount    Float
  date      DateTime    @default(now())
  notes     String?
}
```

---

## 7. API route contract

All routes are prefixed `/api`. All request bodies are validated with Zod;
all failures return `400` with a field-level error list — never a silent
failure. All routes except `/auth/login` require a valid JWT; role
restrictions are noted per route.

| Method | Route | Roles allowed | Owner |
|---|---|---|---|
| POST | `/auth/login` | public | Agent A |
| GET | `/auth/me` | any authenticated | Agent A |
| GET | `/vehicles` | any | Agent B |
| POST | `/vehicles` | FLEET_MANAGER | Agent B |
| PATCH | `/vehicles/:id` | FLEET_MANAGER | Agent B |
| GET | `/drivers` | any | Agent B |
| POST | `/drivers` | FLEET_MANAGER | Agent B |
| PATCH | `/drivers/:id` | FLEET_MANAGER, SAFETY_OFFICER | Agent B |
| GET | `/trips` | any | Agent C |
| POST | `/trips` | DRIVER, FLEET_MANAGER | Agent C |
| PATCH | `/trips/:id/dispatch` | DRIVER, FLEET_MANAGER | Agent C |
| PATCH | `/trips/:id/complete` | DRIVER, FLEET_MANAGER | Agent C |
| PATCH | `/trips/:id/cancel` | DRIVER, FLEET_MANAGER | Agent C |
| GET | `/maintenance` | any | Agent D |
| POST | `/maintenance` | FLEET_MANAGER | Agent D |
| PATCH | `/maintenance/:id/close` | FLEET_MANAGER | Agent D |
| POST | `/fuel-logs` | DRIVER, FLEET_MANAGER | Agent D |
| POST | `/expenses` | FLEET_MANAGER, FINANCIAL_ANALYST | Agent D |
| GET | `/reports/dashboard-kpis` | any | Agent D |
| GET | `/reports/fleet-utilization` | any | Agent D |
| GET | `/reports/operational-cost` | FINANCIAL_ANALYST, FLEET_MANAGER | Agent D |
| GET | `/reports/fuel-efficiency` | FINANCIAL_ANALYST, FLEET_MANAGER | Agent D |
| GET | `/reports/vehicle-roi` | FINANCIAL_ANALYST | Agent D |
| GET | `/reports/export?format=csv` | any | Agent D |

---

## 8. Mandatory business rules (non-negotiable, verbatim from spec)

- Vehicle `registrationNumber` must be unique.
- `RETIRED` or `IN_SHOP` vehicles must never appear in dispatch selection.
- Drivers with expired licenses or `SUSPENDED` status cannot be assigned to trips.
- A driver or vehicle already `ON_TRIP` cannot be assigned to another trip.
- Cargo weight must not exceed the vehicle's max load capacity.
- Dispatching a trip → vehicle and driver both become `ON_TRIP` automatically.
- Completing a trip → vehicle and driver both become `AVAILABLE` automatically.
- Cancelling a dispatched trip → vehicle and driver restored to `AVAILABLE`.
- Creating an active maintenance record → vehicle becomes `IN_SHOP` automatically.
- Closing maintenance → vehicle reverts to `AVAILABLE`, unless it's `RETIRED`.

---

## 9. Agent build briefs

Each section below is self-contained — a developer only needs to give Claude
this file plus their own section name.

### Agent A — Auth, Platform & Shared Frontend Shell

**Owns:** `backend/src/{config,lib,middleware,modules/auth}`,
`frontend/src/shared/*`, `frontend/src/pages/LoginPage.tsx`

**Deliverables:**
- Email/password login issuing a JWT in an httpOnly cookie; `GET /auth/me`
  returning the current user.
- RBAC middleware: `requireAuth`, `requireRole(...roles)`.
- Central error-handling middleware (consistent JSON error shape, no stack
  traces leaked to the client).
- Zod validation middleware wrapper used by every other module.
- Prisma client singleton, Socket.IO server singleton with emit helpers.
- Seed script creating one demo user per role (for the other 3 agents to log
  in with while building).
- Frontend: `AuthContext`, `RequireAuth` route guard (role-aware), Axios
  client with auth header/cookie handling, app shell (sidebar + topbar +
  dark-mode toggle) that the other agents' pages render inside of, login page.

### Agent B — Vehicle Registry & Driver Management

**Owns:** `backend/src/modules/{vehicles,drivers}`,
`frontend/src/pages/{VehiclesPage,DriversPage}.tsx`

**Deliverables:**
- Full CRUD for Vehicles: registration number uniqueness enforced at the DB
  and validation layer; status enum restricted to the 4 allowed values;
  search/filter by status, type, region.
- Full CRUD for Drivers: license number uniqueness; license expiry date
  validation; status enum restricted to the 4 allowed values; safety score
  field for the Safety Officer role.
- Both pages: table view with filters/search/sort, create/edit forms with
  inline validation errors, status badges using consistent color semantics
  (e.g. green = Available, amber = On Trip, red = In Shop/Suspended, gray =
  Retired/Off Duty) shared with Agent C and D's pages.

### Agent C — Trip Management & Dispatch (critical path)

**Owns:** `backend/src/modules/trips`, `frontend/src/pages/TripsPage.tsx`

This is the module every mandatory business rule under Section 8 lives in —
build this first and test it thoroughly, since Agent D's reports depend on
trip data being correct.

**Deliverables:**
- `POST /trips` — create as `DRAFT`, validating cargo weight against the
  selected vehicle's capacity.
- `PATCH /trips/:id/dispatch` — re-validates vehicle/driver availability and
  license status at the moment of dispatch (not just at creation, since time
  may have passed), then atomically sets trip → `DISPATCHED`, vehicle →
  `ON_TRIP`, driver → `ON_TRIP` in a single DB transaction.
- `PATCH /trips/:id/complete` — accepts final odometer + fuel consumed, sets
  trip → `COMPLETED`, vehicle and driver → `AVAILABLE`, updates the
  vehicle's `odometerKm`.
- `PATCH /trips/:id/cancel` — only valid from `DISPATCHED`; reverts vehicle
  and driver to `AVAILABLE`.
- Emit a Socket.IO event on every status transition so the dashboard (Agent
  D) and vehicle/driver lists (Agent B) update live without a page refresh.
- Frontend: trip creation form that only lists vehicles/drivers currently
  `AVAILABLE`, with the capacity check surfaced as a live inline validation
  before submit (not just a server error after the fact); dispatch/complete/
  cancel actions with confirmation and clear error messaging when a rule
  blocks the action (e.g. "Cargo weight 550kg exceeds Van-05's 500kg
  capacity").

### Agent D — Maintenance, Fuel/Expenses, Reports & Dashboard

**Owns:** `backend/src/modules/{maintenance,fuel,reports}`,
`frontend/src/pages/{MaintenancePage,FuelPage,DashboardPage,ReportsPage}.tsx`

**Deliverables:**
- `POST /maintenance` — creates an `OPEN` log and atomically sets the
  vehicle to `IN_SHOP`.
- `PATCH /maintenance/:id/close` — sets `CLOSED` and reverts the vehicle to
  `AVAILABLE` unless its status is `RETIRED`.
- `POST /fuel-logs`, `POST /expenses` — simple validated create endpoints.
- Reports: fleet utilization (%), operational cost (fuel + maintenance) per
  vehicle, fuel efficiency (distance/fuel), vehicle ROI
  `(revenue - (maintenance + fuel)) / acquisitionCost`, all computed from
  live data, not cached/static numbers. CSV export on each report.
- Dashboard KPIs: Active Vehicles, Available Vehicles, Vehicles in
  Maintenance, Active Trips, Pending Trips, Drivers On Duty, Fleet
  Utilization (%) — subscribed to the Socket.IO events Agent C emits so
  numbers update live as trips are dispatched/completed in another tab.
  This live-update behavior is your strongest demo moment — prioritize it
  over chart polish if time is short.

---

## 10. Git workflow

- `main` is protected — no direct pushes.
- Each agent works on `feature/agent-<letter>-<short-desc>` branches inside
  their own directories only.
- Commit small and often (every working increment, not one giant end-of-day
  commit) — this reduces merge pain given the parallel workflow.
- Open a PR the moment a module's core flow works end-to-end, even before
  it's fully polished, so the other 3 agents can integrate against it early.
- Merge conflicts should only ever happen in the 3 shared files listed in
  Section 5 (`schema.prisma`, `shared/types.ts`, and the app shell) — if you
  see a conflict anywhere else, someone strayed outside their directory.

## 11. Deliverables checklist (from spec Section 7)

- [ ] Responsive web interface
- [ ] Authentication with RBAC
- [ ] CRUD for Vehicles and Drivers
- [ ] Trip Management with validations
- [ ] Automatic status transitions
- [ ] Maintenance workflow
- [ ] Fuel & Expense tracking
- [ ] Dashboard with KPIs
- [ ] Charts and visual analytics
- [ ] CSV export (PDF export optional/bonus)
- [ ] Search, filters, and sorting
- [ ] Bonus (time permitting): dark mode, email reminders for expiring
      licenses, vehicle document management
