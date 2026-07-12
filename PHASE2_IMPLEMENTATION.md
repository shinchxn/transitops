// File: PHASE2_IMPLEMENTATION.md
# Phase 2 — Agent B: Vehicle Registry & Driver Management

## Implementation Summary

This document outlines the complete implementation of Phase 2 (Agent B) for the TransitOps platform, comprising vehicle and driver management modules with full CRUD operations, advanced filtering, real-time updates, and production-grade UI/UX.

---

## Architecture & Design Rationale

### 1. **Prisma Schema Updates**

**Why the schema needed modification:**
The original schema didn't match the spec's data model. The spec requires:
- Vehicles: `registrationNumber`, `name`, `type`, `maxLoadCapacityKg`, `acquisitionCost`, `region`, `odometerKm`
- Drivers: standalone profiles with `name`, `licenseNumber`, `licenseCategory`, `licenseExpiryDate`, `contactNumber`, `safetyScore`

The existing schema used different field names (`plateNumber`, `capacityTons`, etc.) and tied drivers to users. The updated schema now matches the spec exactly and ensures data integrity at the database level.

**Key decisions:**
- Driver model is standalone (not a foreign key to User) — enables independent driver profiles
- All status enums default to sensible values (AVAILABLE for vehicles/drivers, 100 for safetyScore)
- `region` is optional for flexibility in global/multi-region operations

---

### 2. **Backend Module Architecture**

Each module follows a strict 4-file convention:

#### **`*.schema.ts`** — Validation & Types
- Zod schemas for request validation with smart coercion (e.g., `z.coerce.number()`)
- `.strict()` on update schemas to reject unknown fields (prevents accidental data overwrites)
- Specialized validations (e.g., `status !== "ON_TRIP"` can only be set by trip dispatch logic)
- Exported TypeScript types for use in controllers and services

#### **`*.service.ts`** — Business Logic & Data Access
- Encapsulates all Prisma queries
- Builds dynamic `where` clauses from filter params (e.g., search uses `OR` with case-insensitive `contains`)
- Uses `prisma.$transaction([findMany, count])` for paginated lists — ensures consistent pagination metadata in a single DB round trip (no race conditions between count and data fetch)
- Handles duplicate key violations (`P2002`) and converts to clean `400 DUPLICATE_VALUE` responses
- Handles missing records (`P2025`) and converts to `404 NOT_FOUND`
- Emits socket events after mutations so real-time clients see updates

#### **`*.controller.ts`** — HTTP Request/Response Handling
- Thin layer: parses request, calls service, responds with status code and data
- All validation and error handling delegated to middleware and service

#### **`*.routes.ts`** — Route Definition & Middleware Composition
- Declares endpoints with middleware pipeline: `requireAuth` → `requireRole` → `validate` → `asyncHandler(controller)`
- Follows REST conventions (GET, POST, PATCH)
- Role-based access control: FLEET_MANAGER can create/edit both vehicles and drivers; SAFETY_OFFICER can only edit drivers (set safetyScore/status)

---

### 3. **Pagination Metadata via Transaction**

```typescript
const [data, total] = await prisma.$transaction([
  prisma.vehicle.findMany({ where, orderBy, skip, take }),
  prisma.vehicle.count({ where }),
]);
```

**Why `$transaction`?**
- Guarantees that count is from the *exact same* dataset as the paginated results
- Eliminates race conditions where a record might be inserted/deleted between the count and findMany, causing pagination mismatches
- Single round trip to the database improves performance

**Why not separate calls?**
- Without a transaction, the database state can change between count and fetch, resulting in inconsistent `totalPages` calculations
- Example: count returns 25, fetch 20 records, then 5 new records are inserted — `totalPages` would be wrong

---

### 4. **Dynamic Query Building**

**Search:**
```typescript
where.OR = [
  { name: { contains: search, mode: "insensitive" } },
  { registrationNumber: { contains: search, mode: "insensitive" } },
]
```
- Case-insensitive partial matching on both name and registration number
- Supports user-friendly queries (e.g., "van" matches "Van-05" and "Chevrolet Van")

**Sorting:**
```typescript
const sortField = sort.startsWith("-") ? sort.slice(1) : sort;
const sortDir = sort.startsWith("-") ? "desc" : "asc";
```
- RESTful convention: `-` prefix means descending
- Supported fields: `name`, `createdAt`, `odometerKm` (vehicles); `name`, `licenseExpiryDate`, `safetyScore` (drivers)

**Filtering:**
- Vehicles: status, type, region, search, sort, page, limit
- Drivers: status, search, expiringWithinDays, sort, page, limit
- All query params flow through URL to enable bookmarkable/shareable filtered views

---

### 5. **Frontend State Management**

**URL-Driven State:**
- All filters/sort/pagination live in `useSearchParams()`, not component state
- Refreshing the page preserves the exact view
- Filters are shareable via URL copy/paste

**Debouncing Search:**
- Search input has 300ms debounce before triggering refetch (prevent excessive DB queries)
- Implemented via `useSearchParams` + `useEffect` dependency

**Socket.IO Real-Time Updates:**
- When another client updates a vehicle/driver, the backend emits `VEHICLE_UPDATED` / `DRIVER_UPDATED`
- Frontend subscribes and patches the row in-place (no full refetch)
- Enables multi-tab/multi-user awareness

---

### 6. **Immutability of Unique Identifiers**

**Why registration number is immutable after creation:**
- Registration number is the primary external identifier for vehicles
- Changing it would break external references (insurance, maintenance logs, invoices)
- Database has a unique constraint, so renaming is operationally complex
- UI hides the field in edit mode to prevent user confusion

**Why license number is immutable after creation:**
- Drivers are uniquely identified by license number (legal requirement)
- Changing it would require auditing all trips and compliance records
- Similar to registration number, it should never change post-creation

---

### 7. **License Expiry Handling**

**Allowed to create drivers with expired licenses:**
- Real-world scenario: Safety Officer imports existing drivers
- License may already be expired when entered into the system
- UI visibly flags expired/expiring licenses in red/yellow
- Business logic (trip dispatch) can check status before assigning

**Expiry Badge Logic:**
- Expired: `licenseExpiryDate < now` → Red "Expired"
- Expiring: `licenseExpiryDate <= now + 30 days` → Yellow "Expiring soon"
- Current: no badge

---

### 8. **Error Handling Strategy**

**Validation Errors:**
- Zod parses request → error if invalid
- `validate` middleware catches Zod errors and converts to `400 VALIDATION_ERROR` with field-level details

**Duplicate Errors:**
- Service catches Prisma `P2002` (unique constraint violation)
- Returns `400 DUPLICATE_VALUE` with field path for friendly UI display

**Not Found Errors:**
- Service catches Prisma `P2025` (no rows updated)
- Returns `404 NOT_FOUND`

**Auth Errors:**
- `requireAuth` middleware throws `401 UNAUTHORIZED` if no user
- `requireRole` throws `403 FORBIDDEN` if user lacks role

**All errors** flow through centralized Express error handler → JSON response with `error` code, `message`, optional `fields` array

---

### 9. **Frontend Form Validation**

**Inline Field Errors:**
- Backend returns `{ fields: [{ path: "registrationNumber", message: "Already in use." }] }`
- Frontend displays error under corresponding input
- Errors cleared on form open (fresh state)

**Registration/License Number Immutability in UI:**
- Edit form hides these fields (shown in create only)
- Prevents user confusion and accidental "editing" of immutable fields

---

## File Structure

```
backend/src/
├── lib/
│   ├── AppError.ts           # Error class with field validation
│   ├── asyncHandler.ts       # Wraps async route handlers
│   ├── auth.ts               # requireAuth, requireRole middleware
│   ├── validate.ts           # Zod validation middleware
│   ├── socket.ts             # Socket.IO event definitions & emit
│   └── prisma.ts             # Prisma client singleton
├── modules/
│   ├── vehicles/
│   │   ├── vehicles.schema.ts
│   │   ├── vehicles.service.ts
│   │   ├── vehicles.controller.ts
│   │   └── vehicles.routes.ts
│   └── drivers/
│       ├── drivers.schema.ts
│       ├── drivers.service.ts
│       ├── drivers.controller.ts
│       └── drivers.routes.ts
└── index.ts                  # Express app, middleware, error handler

frontend/src/
├── shared/
│   ├── api.ts               # HTTP client
│   ├── socket.ts            # Socket.IO client
│   ├── types.ts             # Shared TS types (Vehicle, Driver, etc.)
│   └── colors.ts            # Status badge colors & helpers
└── pages/
    ├── VehiclesPage.tsx     # Vehicle list, filter, form
    └── DriversPage.tsx      # Driver list, filter, form (w/ expiry)
```

---

## API Endpoints

### Vehicles

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | `/api/vehicles` | All | List vehicles with filters/sort/pagination |
| POST | `/api/vehicles` | FLEET_MANAGER | Create vehicle |
| PATCH | `/api/vehicles/:id` | FLEET_MANAGER | Update vehicle |

**Query Params (GET):**
- `search` — name or registration number (substring, case-insensitive)
- `status` — AVAILABLE, ON_TRIP, IN_SHOP, RETIRED
- `type`, `region` — exact/substring match
- `sort` — name, -name, createdAt, -createdAt, odometerKm, -odometerKm
- `page` (default 1), `limit` (default 20, max 100)

### Drivers

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | `/api/drivers` | All | List drivers with filters/sort/pagination |
| POST | `/api/drivers` | FLEET_MANAGER | Create driver |
| PATCH | `/api/drivers/:id` | FLEET_MANAGER, SAFETY_OFFICER | Update driver |

**Query Params (GET):**
- `search` — name or license number
- `status` — AVAILABLE, ON_TRIP, OFF_DUTY, SUSPENDED
- `expiringWithinDays` — filter to licenses expiring within N days
- `sort` — name, -name, licenseExpiryDate, -licenseExpiryDate, safetyScore, -safetyScore
- `page`, `limit`

---

## Testing Commands

### Prerequisites
```bash
cd transitops
npm install  # install dependencies

# Assuming Node/npm is set up, start the backend:
npm run dev  # or: tsx watch backend/src/index.ts

# In another terminal, start the frontend:
cd frontend
npm run dev  # Vite dev server on http://localhost:5173
```

### cURL Examples (with mock auth headers)

#### Create Vehicle
```bash
curl -i -X POST http://localhost:4000/api/vehicles \
  -H "Content-Type: application/json" \
  -H "x-user-role: FLEET_MANAGER" \
  -d '{
    "registrationNumber": "VAN-05",
    "name": "Van 05",
    "type": "Van",
    "maxLoadCapacityKg": 500,
    "acquisitionCost": 18000,
    "region": "North"
  }'
```

**Expected Response (201):**
```json
{
  "id": "c1a2…",
  "registrationNumber": "VAN-05",
  "name": "Van 05",
  "type": "Van",
  "maxLoadCapacityKg": 500,
  "acquisitionCost": 18000,
  "region": "North",
  "odometerKm": 0,
  "status": "AVAILABLE",
  "createdAt": "2026-07-12T09:00:00.000Z",
  "updatedAt": "2026-07-12T09:00:00.000Z"
}
```

#### Duplicate Registration Number
```bash
curl -i -X POST http://localhost:4000/api/vehicles \
  -H "Content-Type: application/json" \
  -H "x-user-role: FLEET_MANAGER" \
  -d '{"registrationNumber":"VAN-05","name":"Dup","type":"Van","maxLoadCapacityKg":500,"acquisitionCost":18000}'
```

**Expected Response (400):**
```json
{
  "error": "DUPLICATE_VALUE",
  "message": "Registration number already in use.",
  "fields": [{"path": "registrationNumber", "message": "Already in use."}]
}
```

#### Reject Manual ON_TRIP Status
```bash
curl -i -X PATCH http://localhost:4000/api/vehicles/<id> \
  -H "Content-Type: application/json" \
  -H "x-user-role: FLEET_MANAGER" \
  -d '{"status":"ON_TRIP"}'
```

**Expected Response (400):**
```json
{
  "error": "VALIDATION_ERROR",
  "message": "One or more fields are invalid.",
  "fields": [{"path": "status", "message": "ON_TRIP can only be set automatically by trip dispatch."}]
}
```

#### List with Filters & Pagination
```bash
curl -i "http://localhost:4000/api/vehicles?status=AVAILABLE&search=van&sort=name&page=1&limit=10" \
  -H "x-user-role: FLEET_MANAGER"
```

**Expected Response (200):**
```json
{
  "data": [
    {"id":"…","registrationNumber":"VAN-05","name":"Van 05","…":"…"}
  ],
  "meta": {"total": 1, "page": 1, "limit": 10, "totalPages": 1}
}
```

#### Create Driver
```bash
curl -i -X POST http://localhost:4000/api/drivers \
  -H "Content-Type: application/json" \
  -H "x-user-role: FLEET_MANAGER" \
  -d '{
    "name": "John Doe",
    "licenseNumber": "DL-12345",
    "licenseCategory": "D",
    "licenseExpiryDate": "2027-12-31",
    "contactNumber": "+1-555-0123"
  }'
```

**Expected Response (201):**
```json
{
  "id": "d9b3…",
  "name": "John Doe",
  "licenseNumber": "DL-12345",
  "licenseCategory": "D",
  "licenseExpiryDate": "2027-12-31T00:00:00.000Z",
  "contactNumber": "+1-555-0123",
  "safetyScore": 100,
  "status": "AVAILABLE",
  "createdAt": "2026-07-12T09:00:00.000Z",
  "updatedAt": "2026-07-12T09:00:00.000Z"
}
```

#### Update Driver (Safety Officer sets safety score)
```bash
curl -i -X PATCH http://localhost:4000/api/drivers/<id> \
  -H "Content-Type: application/json" \
  -H "x-user-role: SAFETY_OFFICER" \
  -d '{"safetyScore": 85}'
```

**Expected Response (200):**
```json
{
  "id": "d9b3…",
  "name": "John Doe",
  "safetyScore": 85,
  "…": "…"
}
```

---

## Key Test Scenarios

- [x] Create vehicle with valid data → 201 with object
- [x] Create vehicle with duplicate registration → 400 DUPLICATE_VALUE
- [x] Create vehicle with invalid capacity (≤ 0) → 400 VALIDATION_ERROR
- [x] Update vehicle status to ON_TRIP manually → 400 (schema validation)
- [x] Update nonexistent vehicle → 404 NOT_FOUND
- [x] PATCH with unknown field → 400 (`.strict()` rejects)
- [x] List vehicles with search, filter, sort, pagination
- [x] Search matches partial name and registration number
- [x] Create driver with expired license → 201 (allowed)
- [x] Driver with expired license shows red badge in UI
- [x] Driver with license expiring within 30 days shows yellow badge in UI
- [x] Query param changes trigger refetch (no client-side filtering of full array)
- [x] Socket event updates vehicle/driver in real-time without refetch
- [x] Registration number field hidden in vehicle edit form
- [x] License number field hidden in driver edit form
- [x] Inline field errors render under inputs on validation failure

---

## Production Considerations

1. **Authentication:** Replace mock `x-user-*` headers with real JWT verification in `requireAuth`
2. **Database:** Migrate from mock Prisma setup to real PostgreSQL/MySQL connection
3. **Socket.IO:** Implement proper room management for multi-tenant support (fleet segregation)
4. **Rate Limiting:** Add rate limiting on list endpoints to prevent abuse
5. **Logging:** Structured logging for all service operations
6. **Caching:** Consider Redis for frequently accessed vehicle/driver lists
7. **Audit Trail:** Log all mutations (create/update) for compliance
8. **Soft Deletes:** Consider marking vehicles/drivers as deleted rather than hard-deleting

---

## Edge Cases Handled

| Scenario | Behavior |
|----------|----------|
| Duplicate registration/license | Clean 400 with friendly message |
| Missing vehicle/driver on PATCH | 404 NOT_FOUND |
| Non-numeric capacity/cost | Coerced by Zod or rejected as VALIDATION_ERROR |
| ON_TRIP status manual assignment | Rejected by schema validation (not on schema, but in service layer) |
| Expired license date | Allowed; UI flags with badge |
| Empty search results | 200 with `data: []` |
| Invalid sort field | Ignored (defaults to `-createdAt`) |
| Page out of range | Returns empty array (no 400) |
| Unauthorized role | 403 FORBIDDEN |
| Unauthenticated request | 401 UNAUTHORIZED |

---

## Done Checklist

- [x] Prisma schema updated to match spec
- [x] Backend: all schemas, services, controllers, routes
- [x] Backend: centralized error handling, validation, auth middleware
- [x] Backend: dynamic query building with filters, search, sort, pagination
- [x] Backend: `$transaction` for pagination consistency
- [x] Backend: duplicate/404 error handling
- [x] Backend: socket event emission on mutations
- [x] Frontend: API client
- [x] Frontend: socket client
- [x] Frontend: shared types & color utilities
- [x] Frontend: VehiclesPage with filters, sort, pagination, modal form
- [x] Frontend: DriversPage with license expiry badges, safety score visual
- [x] Frontend: URL-driven state for bookmarkable views
- [x] Frontend: inline field error display
- [x] Frontend: real-time socket updates
- [x] Test commands & expected responses documented
