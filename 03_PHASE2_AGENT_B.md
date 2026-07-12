# PHASE 2 — AGENT B: Vehicle Registry & Driver Management (Detailed Spec)

> Paste this whole file into a fresh Claude session, with `SOLUTION.md`
> attached. Requires Phase 0 + Phase 1 (Agent A) already merged — you
> `import` `prisma`, `AppError`, `asyncHandler`, `requireAuth`,
> `requireRole`, `validate`, `AppShell`, `RequireAuth`, `api`,
> `StatusBadge`/`getStatusColor`, and `SOCKET_EVENTS` from Agent A's
> output rather than reimplementing any of them. **Follow Agent A's
> `schema.ts`/`service.ts`/`controller.ts`/`routes.ts` module convention
> exactly** — see Section 0 of the Agent A brief if you don't have it.

---

## SYSTEM ROLE

You are an Elite Principal Software Engineer building the Vehicle and
Driver modules for a 4-agent parallel hackathon build. Production-ready,
strictly-typed, no placeholder code.

## RUBRIC COMPLIANCE FOR THIS PHASE

- **Resilient Core:** every route — Zod validation, `try/catch` via
  `asyncHandler`, uniqueness violations caught and returned as clean
  `400`s (handled centrally by Agent A's `errorHandler` for `P2002`, but
  you still need a pre-check where a friendlier message matters).
- **Dynamic Ingestion:** vehicle/driver lists, filters, search, and sort
  all hit the live DB through Prisma with real `where`/`orderBy` clauses —
  never a client-side filter of a full fetched array.
- **Production UI/UX:** paginated, sortable, filterable tables; inline
  validation errors on forms; responsive layout; consistent status colors
  via Agent A's `StatusBadge`.

## STRICT DIRECTORY ISOLATION — YOUR ZONE ONLY

```
backend/src/modules/vehicles/
backend/src/modules/drivers/
frontend/src/pages/VehiclesPage.tsx
frontend/src/pages/DriversPage.tsx
```

Do not edit `schema.prisma`, `shared/types.ts`, anything under
`backend/src/{config,lib,middleware}`, or another agent's modules/pages —
flag it instead of editing silently.

---

## MODULE FILE LAYOUT (mirrors Agent A's convention)

```
backend/src/modules/vehicles/
├── vehicles.schema.ts
├── vehicles.service.ts
├── vehicles.controller.ts
└── vehicles.routes.ts

backend/src/modules/drivers/
├── drivers.schema.ts
├── drivers.service.ts
├── drivers.controller.ts
└── drivers.routes.ts
```

---

## 1. Vehicles — Full Contract

**`vehicles.schema.ts`**
```typescript
import { z } from "zod";

const VehicleStatusEnum = z.enum(["AVAILABLE", "ON_TRIP", "IN_SHOP", "RETIRED"]);

export const CreateVehicleSchema = z.object({
  registrationNumber: z.string().min(2).max(20),
  name: z.string().min(1).max(100),
  type: z.string().min(1).max(50),
  maxLoadCapacityKg: z.coerce.number().positive("Must be greater than 0."),
  acquisitionCost: z.coerce.number().nonnegative("Cannot be negative."),
  region: z.string().max(100).optional(),
  // status intentionally omitted — new vehicles always start AVAILABLE
});

export const UpdateVehicleSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  type: z.string().min(1).max(50).optional(),
  maxLoadCapacityKg: z.coerce.number().positive().optional(),
  acquisitionCost: z.coerce.number().nonnegative().optional(),
  region: z.string().max(100).optional(),
  odometerKm: z.coerce.number().nonnegative().optional(),
  status: VehicleStatusEnum
    .refine((s) => s !== "ON_TRIP", {
      message: "ON_TRIP can only be set automatically by trip dispatch.",
    })
    .optional(),
}).strict(); // reject unknown keys outright rather than silently dropping them

export const VehicleQuerySchema = z.object({
  status: VehicleStatusEnum.optional(),
  type: z.string().optional(),
  region: z.string().optional(),
  search: z.string().optional(), // matches name OR registrationNumber, case-insensitive
  sort: z.enum(["name", "-name", "createdAt", "-createdAt", "odometerKm", "-odometerKm"])
    .default("-createdAt"),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
```

**`vehicles.service.ts`** — key functions and their responsibilities:
- `listVehicles(query)` — builds a Prisma `where` from `status`/`type`/
  `region`/`search` (search uses `OR: [{ name: { contains, mode:
  "insensitive" } }, { registrationNumber: { contains, mode: "insensitive" } }]`),
  `orderBy` parsed from the `sort` string (leading `-` = descending),
  `skip = (page - 1) * limit`, `take = limit`; runs `prisma.$transaction([
  findMany, count])` so the total count for pagination metadata is
  computed in the same round trip. Returns `{ data, meta: { total, page,
  limit, totalPages } }`.
- `createVehicle(input)` — `prisma.vehicle.create`; on `P2002` re-thrown as
  a clean `AppError(400, "DUPLICATE_VALUE", "Registration number already
  in use.", [{ path: "registrationNumber", message: "Already in use." }])`
  rather than relying solely on the generic handler, since you can give a
  more specific message here than the generic fallback can.
- `updateVehicle(id, input)` — if `input.status` transitions away from
  `IN_SHOP` or to `RETIRED`/other manual states, allow it; the schema
  already blocks `ON_TRIP`. Throw `AppError(404, "NOT_FOUND", "Vehicle not
  found.")` if the id doesn't exist (`P2025` from `update` on a missing
  row, caught the same way as create). After a successful update, call
  Agent A's `emitEvent(SOCKET_EVENTS.VEHICLE_UPDATED, vehicle)` so the
  dashboard and other open tabs reflect manual edits too, not just
  trip-driven ones.

**`vehicles.controller.ts`** — thin: parse `req.query`/`req.body` (already
parsed/coerced by `validate`), call service, respond `200`/`201` with the
service's return value directly.

**`vehicles.routes.ts`**
```typescript
router.get("/", requireAuth, validate({ query: VehicleQuerySchema }), asyncHandler(list));
router.post("/", requireAuth, requireRole("FLEET_MANAGER"), validate({ body: CreateVehicleSchema }), asyncHandler(create));
router.patch("/:id", requireAuth, requireRole("FLEET_MANAGER"), validate({ body: UpdateVehicleSchema }), asyncHandler(update));
```

**Example responses:**
```json
// 201 POST /api/vehicles
{
  "id": "c1a2…", "registrationNumber": "VAN-05", "name": "Van 05", "type": "Van",
  "maxLoadCapacityKg": 500, "odometerKm": 0, "acquisitionCost": 18000,
  "status": "AVAILABLE", "region": "North", "createdAt": "2026-07-12T09:00:00.000Z", "updatedAt": "2026-07-12T09:00:00.000Z"
}
```
```json
// 400 POST /api/vehicles (duplicate registration number)
{ "error": "DUPLICATE_VALUE", "message": "Registration number already in use.",
  "fields": [{ "path": "registrationNumber", "message": "Already in use." }] }
```
```json
// 200 GET /api/vehicles?status=AVAILABLE&sort=name&page=1&limit=20
{ "data": [ { "id": "…", "registrationNumber": "VAN-05", "...": "..." } ],
  "meta": { "total": 1, "page": 1, "limit": 20, "totalPages": 1 } }
```
```json
// 400 PATCH /api/vehicles/:id  (attempt to set ON_TRIP manually)
{ "error": "VALIDATION_ERROR", "message": "One or more fields are invalid.",
  "fields": [{ "path": "status", "message": "ON_TRIP can only be set automatically by trip dispatch." }] }
```

---

## 2. Drivers — Full Contract

**`drivers.schema.ts`**
```typescript
import { z } from "zod";

const DriverStatusEnum = z.enum(["AVAILABLE", "ON_TRIP", "OFF_DUTY", "SUSPENDED"]);

export const CreateDriverSchema = z.object({
  name: z.string().min(1).max(100),
  licenseNumber: z.string().min(2).max(30),
  licenseCategory: z.string().min(1).max(20),
  licenseExpiryDate: z.coerce.date(),
  contactNumber: z.string().min(7).max(20),
  // safetyScore defaults to 100 in the schema; not settable on create
});

export const UpdateDriverSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  licenseCategory: z.string().min(1).max(20).optional(),
  licenseExpiryDate: z.coerce.date().optional(),
  contactNumber: z.string().min(7).max(20).optional(),
  safetyScore: z.coerce.number().min(0).max(100).optional(),
  status: DriverStatusEnum
    .refine((s) => s !== "ON_TRIP", {
      message: "ON_TRIP can only be set automatically by trip dispatch.",
    })
    .optional(),
}).strict();

export const DriverQuerySchema = z.object({
  status: DriverStatusEnum.optional(),
  search: z.string().optional(), // matches name OR licenseNumber
  expiringWithinDays: z.coerce.number().int().positive().optional(), // e.g. ?expiringWithinDays=30
  sort: z.enum(["name", "-name", "licenseExpiryDate", "-licenseExpiryDate", "safetyScore", "-safetyScore"])
    .default("name"),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
```

**`drivers.service.ts`** — same `listVehicles`-style pattern for
`listDrivers`, plus:
- `expiringWithinDays` filter: `licenseExpiryDate: { lte: addDays(now,
  n) }` — powers a "licenses expiring soon" view the Safety Officer role
  cares about (Section 3).
- `createDriver` / `updateDriver` mirror the vehicle service's duplicate
  and 404 handling, using `licenseNumber` as the unique field. `PATCH`
  guarded by `requireRole("FLEET_MANAGER", "SAFETY_OFFICER")` per the
  route table — note in your response that a Safety Officer can therefore
  edit `safetyScore` and `status` but a Fleet Manager can edit everything;
  the route doesn't need field-level role splitting for this hackathon
  scope, just document the assumption.

**`drivers.routes.ts`**
```typescript
router.get("/", requireAuth, validate({ query: DriverQuerySchema }), asyncHandler(list));
router.post("/", requireAuth, requireRole("FLEET_MANAGER"), validate({ body: CreateDriverSchema }), asyncHandler(create));
router.patch("/:id", requireAuth, requireRole("FLEET_MANAGER", "SAFETY_OFFICER"), validate({ body: UpdateDriverSchema }), asyncHandler(update));
```

---

## 3. Edge Cases You Must Explicitly Handle

| Case | Expected behavior |
|---|---|
| Duplicate `registrationNumber` on create | `400 DUPLICATE_VALUE` |
| Duplicate `licenseNumber` on create | `400 DUPLICATE_VALUE` |
| `PATCH` with `status: "ON_TRIP"` | `400 VALIDATION_ERROR`, rejected before hitting the DB |
| `PATCH` on a nonexistent id | `404 NOT_FOUND` |
| `maxLoadCapacityKg <= 0` or non-numeric | `400 VALIDATION_ERROR` |
| `acquisitionCost < 0` | `400 VALIDATION_ERROR` |
| Create driver with `licenseExpiryDate` in the past | **allowed** — Safety Officer needs to record reality; UI must visibly flag it (see below) |
| `PATCH` body includes an unrecognized field (e.g. `id`, `createdAt`) | `400`, rejected by `.strict()` rather than silently ignored |
| `search` query with no matches | `200` with `data: []`, not an error |

---

## 4. Frontend Deliverables — Component Breakdown

**`VehiclesPage.tsx`** composed of:
- `useVehicles(query)` — a small custom hook wrapping `api.get("/vehicles",
  { params: query })`, returning `{ data, meta, loading, error, refetch }`.
  Re-fetches whenever `query` changes.
- `VehicleFilters` — search input (debounced 300ms before triggering a
  refetch), status `<select>`, type/region text filters, sort `<select>`.
  All filter state lives in the URL query string (`useSearchParams`) so
  filtered views are shareable/bookmarkable and survive a refresh.
- `VehicleTable` — columns: registration number, name, type, capacity,
  odometer, status (`<StatusBadge>`), region, actions (Edit). Sortable
  column headers toggle the `sort` param. Pagination controls at the
  bottom driven by `meta.totalPages`.
- `VehicleFormModal` — used for both create and edit (pass an optional
  `vehicle` prop; omit `registrationNumber` field from the edit form since
  it's immutable after creation — flag this UX choice explicitly, it's
  not in the literal spec but prevents a real-world data-integrity
  problem). Inline field errors rendered directly under each input from
  the `fields` array of a `400` response.
- Subscribes to `SOCKET_EVENTS.VEHICLE_UPDATED` (Agent A's socket client)
  to patch the relevant row in place without a full refetch when another
  tab/agent's module changes a vehicle's status.

**`DriversPage.tsx`** — same pattern (`useDrivers`, `DriverFilters`,
`DriverTable`, `DriverFormModal`), plus:
- License expiry column shows a colored badge: red if
  `licenseExpiryDate < now` ("Expired"), amber if within 30 days
  ("Expiring soon"), otherwise no badge — this is a page-local extension
  of Agent A's color semantics (expired/expiring aren't in the core
  status enum), implement it as a small local helper, not by editing
  Agent A's shared `colors.ts`.
- Safety score shown as a numeric badge/progress indicator, editable only
  in the form for users with `FLEET_MANAGER`/`SAFETY_OFFICER` role
  (`useAuth()` from Agent A's context to conditionally render the field
  or the whole Edit action).

---

## OUTPUT FORMAT REQUIRED

- File path comment at the top of every file.
- Complete, runnable files.
- Brief rationale on: why pagination metadata is computed via
  `$transaction([findMany, count])` instead of two separate round trips,
  and why `registrationNumber` is treated as immutable in the UI.

## DEFINITION OF DONE — VERIFY WITH THESE COMMANDS

```bash
# Create (as fleet manager cookie from Agent A's login)
curl -i -b cookies.txt -X POST http://localhost:4000/api/vehicles \
  -H "Content-Type: application/json" \
  -d '{"registrationNumber":"VAN-05","name":"Van 05","type":"Van","maxLoadCapacityKg":500,"acquisitionCost":18000,"region":"North"}'

# Duplicate — expect 400 DUPLICATE_VALUE
curl -i -b cookies.txt -X POST http://localhost:4000/api/vehicles \
  -H "Content-Type: application/json" \
  -d '{"registrationNumber":"VAN-05","name":"Dup","type":"Van","maxLoadCapacityKg":500,"acquisitionCost":18000}'

# Reject manual ON_TRIP — expect 400 VALIDATION_ERROR
curl -i -b cookies.txt -X PATCH http://localhost:4000/api/vehicles/<id> \
  -H "Content-Type: application/json" -d '{"status":"ON_TRIP"}'

# Filter/search/sort/paginate
curl -i -b cookies.txt "http://localhost:4000/api/vehicles?status=AVAILABLE&search=van&sort=name&page=1&limit=10"
```
- Network tab confirms query params change on every filter/search/sort
  interaction (no client-side re-filtering of an already-fetched list).
- Expired/expiring driver licenses are visibly flagged in the table.
