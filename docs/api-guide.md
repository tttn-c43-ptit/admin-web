# Plant Care API — Frontend Guide

> Auto-generated from the live OpenAPI spec by `scripts/gen_api_docs.py`. Do not edit by hand — re-run the generator after API changes.

## Conventions

- **Base URL:** `http://localhost:8000` (all paths below are prefixed with `/api`).
- **Auth:** JSON Web Token bearer. Call `POST /api/auth/login`, then send `Authorization: Bearer <access_token>` on every non-public endpoint. Refresh with `POST /api/auth/refresh` when the access token expires.
- **Roles:** `OWNER` (full control of their gardens) and `STAFF` (field worker, scoped to assigned zones). Registration always creates an OWNER; owners provision STAFF via `POST /api/staff`.
- **Content type:** `application/json` for all request bodies.
- **Pagination:** list endpoints take `limit` (1–100, default 20) and `offset` (≥0, default 0) and return `{ items: [...], total: int, limit: int, offset: int }`.
- **Timestamps:** RFC 3339 / ISO 8601 UTC (e.g. `2026-07-18T06:30:00Z`).

### Error responses

| Status | Meaning |
| --- | --- |
| 400 | Malformed request |
| 401 | Missing/invalid/expired token |
| 403 | Authenticated but not allowed (e.g. another owner's resource) |
| 404 | Resource does not exist (or is hidden to avoid cross-tenant leaks) |
| 409 | Conflict (duplicate, or an illegal state transition) |
| 422 | Validation error (bad field value) |


### Enums

| Enum | Values |
| --- | --- |
| `UserRole` | `OWNER`, `STAFF` |
| `PlantStatus` | `UNKNOWN`, `HEALTHY`, `WATCHING`, `SICK`, `DEAD` |
| `TagType` | `QR`, `BARCODE` |
| `TagStatus` | `ACTIVE`, `DAMAGED`, `LOST`, `REPLACED` |
| `TaskType` | `WATER`, `FERTILIZE`, `SPRAY`, `INSPECT`, `HARVEST`, `OTHER` |
| `TaskStatus` | `PENDING`, `IN_PROGRESS`, `DONE`, `CANCELLED` |
| `ItemType` | `FERTILIZER`, `PESTICIDE`, `TOOL`, `OTHER` |
| `StockDirection` | `IN`, `OUT` |

## Endpoints

- [health](#health) — Liveness + database connectivity.
- [auth](#auth) — Registration (owner accounts), login, token refresh, current user.
- [gardens](#gardens) — Gardens and their PostGIS boundary polygon (owner-managed).
- [zones](#zones) — Zones within a garden and staff zone-assignments (UC-09).
- [staff](#staff) — Owner-provisioned STAFF accounts (UC-09).
- [plants](#plants) — Plants, bulk creation with generated codes, and the §4.7 status machine.
- [tags](#tags) — Physical QR/Barcode tags: attach, replace (§4.5), and field scan-lookup.
- [plant-logs](#plant-logs) — Field reports, timeline, offline-sync idempotency (UC-22/UC-25).
- [uploads](#uploads) — Pre-signed PUT URLs for plant photos (MinIO/S3).
- [tasks](#tasks) — Work assignment and the PENDING→IN_PROGRESS→DONE/CANCELLED lifecycle.
- [schedules](#schedules) — Recurring care schedules (cron) that auto-generate tasks (UC-10).
- [notifications](#notifications) — Per-user notification inbox (task assigned / completed).
- [inventory](#inventory) — Supplies catalog + stock ledger (IN/OUT) with low-stock & expiry alerts (UC-12).
- [harvests](#harvests) — Per-plant yield records and season / zone / quality rollups (UC-13).
- [trace](#trace) — Traceability QR codes and the public consumer trace page (UC-14/UC-30).
- [stats](#stats) — Dashboard snapshot: status breakdown, stale plants, per-zone counts, weekly trend, and early-warning alerts (UC-07).
- [ai](#ai) — AI garden-health summary (UC-08) and leaf-photo disease diagnosis (UC-26). Rate-limited; the default providers are deterministic and need no API key.


## health

Liveness + database connectivity.

### `GET /api/health`

Health

**Auth:** Public

**Success:** `200`


## auth

Registration (owner accounts), login, token refresh, current user.

### `POST /api/auth/login`

Login

**Auth:** Public

**Request body**

| Field | Type | Required | Constraint | Description |
| --- | --- | --- | --- | --- |
| `identifier` | string | yes | ≤255 chars | Email address or phone number |
| `password` | string | yes | ≤128 chars | Plain password; hashed server-side with Argon2. |

**Example**

```json
{
  "identifier": "{{owner_email}}",
  "password": "{{owner_password}}"
}
```

**Success:** `200`

### `GET /api/auth/me`

Me

**Auth:** Bearer token

**Success:** `200`

### `POST /api/auth/refresh`

Refresh

**Auth:** Public

**Request body**

| Field | Type | Required | Constraint | Description |
| --- | --- | --- | --- | --- |
| `refresh_token` | string | yes | — | The refresh token returned by login. |

**Example**

```json
{
  "refresh_token": "{{refresh_token}}"
}
```

**Success:** `200`

### `POST /api/auth/register`

Create a garden-owner account (UC-01).

**Auth:** Public

**Request body**

| Field | Type | Required | Constraint | Description |
| --- | --- | --- | --- | --- |
| `email` | email | no | nullable | Login email (unique). Either email or phone is required. |
| `phone` | string | no | pattern `^\+?[0-9]{8,15}$`; nullable | Login phone, digits with optional leading +. Either email or phone is required. |
| `password` | string | yes | 8–128 chars | Plain password; hashed server-side with Argon2. |
| `full_name` | string | yes | 1–100 chars | Person's display name. |

**Example**

```json
{
  "email": "{{owner_email}}",
  "password": "{{owner_password}}",
  "full_name": "Chủ Vườn"
}
```

**Success:** `201`


## gardens

Gardens and their PostGIS boundary polygon (owner-managed).

### `GET /api/gardens`

List Gardens

**Auth:** Bearer token

**Query parameters**

| Name | Type | Required | Constraint | Description |
| --- | --- | --- | --- | --- |
| `limit` | integer | no | 1–100; default `20` | Page size. |
| `offset` | integer | no | ≥0; default `0` | Rows to skip before the page. |

**Success:** `200`

### `POST /api/gardens`

Create Garden

**Auth:** Bearer token

**Request body**

| Field | Type | Required | Constraint | Description |
| --- | --- | --- | --- | --- |
| `name` | string | yes | 1–100 chars | Garden name. |
| `address` | string | no | nullable | Free-text address. |
| `plant_type` | string | no | ≤100 chars; nullable | Crop / variety, e.g. 'Sầu riêng Monthong'. |

**Example**

```json
{
  "name": "Vườn Sầu Riêng",
  "address": "Đắk Lắk",
  "plant_type": "Sầu riêng Monthong"
}
```

**Success:** `201`

### `DELETE /api/gardens/{garden_id}`

Delete Garden

**Auth:** Bearer token

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `garden_id` | uuid | Garden id. |

**Success:** `204`

### `GET /api/gardens/{garden_id}`

Get Garden

**Auth:** Bearer token

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `garden_id` | uuid | Garden id. |

**Success:** `200`

### `PUT /api/gardens/{garden_id}`

Update Garden

**Auth:** Bearer token

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `garden_id` | uuid | Garden id. |

**Request body**

| Field | Type | Required | Constraint | Description |
| --- | --- | --- | --- | --- |
| `name` | string | no | 1–100 chars; nullable | Garden name. |
| `address` | string | no | nullable | Free-text address. |
| `plant_type` | string | no | ≤100 chars; nullable | Crop / variety, e.g. 'Sầu riêng Monthong'. |

**Example**

```json
{
  "name": "Vườn Sầu Riêng (updated)",
  "address": "Tiền Giang"
}
```

**Success:** `200`

### `PUT /api/gardens/{garden_id}/boundary`

Store the map-drawn boundary (GeoJSON Polygon, EPSG:4326) and recompute area (UC-03).

**Auth:** Bearer token

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `garden_id` | uuid | Garden id. |

**Request body**

| Field | Type | Required | Constraint | Description |
| --- | --- | --- | --- | --- |
| `type` | string | yes | — | Always "Polygon" (RFC 7946). |
| `coordinates` | array<array<array<number>>> | yes | — | Array of linear rings; the first is the exterior boundary. Each position is [longitude, latitude] in WGS 84; the ring must be closed. |

**Example**

```json
{
  "type": "Polygon",
  "coordinates": [
    [
      [
        108.0,
        12.7
      ],
      [
        108.002,
        12.7
      ],
      [
        108.002,
        12.702
      ],
      [
        108.0,
        12.702
      ],
      [
        108.0,
        12.7
      ]
    ]
  ]
}
```

**Success:** `200`


## zones

Zones within a garden and staff zone-assignments (UC-09).

### `GET /api/gardens/{garden_id}/zones`

List Zones

**Auth:** Bearer token

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `garden_id` | uuid | Garden id. |

**Success:** `200`

### `POST /api/gardens/{garden_id}/zones`

Create Zone

**Auth:** Bearer token

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `garden_id` | uuid | Garden id. |

**Request body**

| Field | Type | Required | Constraint | Description |
| --- | --- | --- | --- | --- |
| `name` | string | yes | 1–50 chars | Zone name (unique within the garden). |
| `grid_position` | integer | no | nullable | Ordering hint for the zone within the garden layout. |

**Example**

```json
{
  "name": "Khu A",
  "grid_position": 1
}
```

**Success:** `201`

### `DELETE /api/zones/{zone_id}`

Delete Zone

**Auth:** Bearer token

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `zone_id` | uuid | Zone; must belong to the garden. |

**Success:** `204`

### `PUT /api/zones/{zone_id}`

Update Zone

**Auth:** Bearer token

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `zone_id` | uuid | Zone; must belong to the garden. |

**Request body**

| Field | Type | Required | Constraint | Description |
| --- | --- | --- | --- | --- |
| `name` | string | no | 1–50 chars; nullable | Zone name (unique within the garden). |
| `grid_position` | integer | no | nullable | Ordering hint for the zone within the garden layout. |

**Example**

```json
{
  "name": "Khu A1",
  "grid_position": 2
}
```

**Success:** `200`

### `GET /api/zones/{zone_id}/assignments`

List Assignments

**Auth:** Bearer token

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `zone_id` | uuid | Zone; must belong to the garden. |

**Success:** `200`

### `POST /api/zones/{zone_id}/assignments`

Put a staff member in charge of this zone (UC-09).

**Auth:** Bearer token

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `zone_id` | uuid | Zone; must belong to the garden. |

**Request body**

| Field | Type | Required | Constraint | Description |
| --- | --- | --- | --- | --- |
| `user_id` | uuid | yes | — | The STAFF user to assign (must be one of your staff). |

**Example**

```json
{
  "user_id": "{{staff_id}}"
}
```

**Success:** `201`

### `DELETE /api/zones/{zone_id}/assignments/{user_id}`

Unassign Staff

**Auth:** Bearer token

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `user_id` | uuid | The STAFF user to assign (must be one of your staff). |
| `zone_id` | uuid | Zone; must belong to the garden. |

**Success:** `204`


## staff

Owner-provisioned STAFF accounts (UC-09).

### `GET /api/staff`

List Staff

**Auth:** Bearer token

**Success:** `200`

### `POST /api/staff`

Owner provisions a STAFF account for a crew member (UC-09).

**Auth:** Bearer token

**Request body**

| Field | Type | Required | Constraint | Description |
| --- | --- | --- | --- | --- |
| `email` | email | no | nullable | Login email (unique). Either email or phone is required. |
| `phone` | string | no | pattern `^\+?[0-9]{8,15}$`; nullable | Login phone, digits with optional leading +. Either email or phone is required. |
| `password` | string | yes | 8–128 chars | Plain password; hashed server-side with Argon2. |
| `full_name` | string | yes | 1–100 chars | Person's display name. |

**Example**

```json
{
  "email": "{{staff_email}}",
  "password": "{{staff_password}}",
  "full_name": "Nhân Viên A"
}
```

**Success:** `201`


## plants

Plants, bulk creation with generated codes, and the §4.7 status machine.

### `GET /api/gardens/{garden_id}/plants`

List Plants

**Auth:** Bearer token

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `garden_id` | uuid | Garden id. |

**Query parameters**

| Name | Type | Required | Constraint | Description |
| --- | --- | --- | --- | --- |
| `status` | enum | no | one of: UNKNOWN, HEALTHY, WATCHING, SICK, DEAD; nullable | Status value; validated against the relevant state machine. |
| `zone_id` | uuid | no | nullable | Zone; must belong to the garden. |
| `code` | string | no | ≤16 chars; nullable | The scanned tag_code. |
| `limit` | integer | no | 1–100; default `20` | Page size. |
| `offset` | integer | no | ≥0; default `0` | Rows to skip before the page. |

**Success:** `200`

### `POST /api/gardens/{garden_id}/plants`

Create Plant

**Auth:** Bearer token

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `garden_id` | uuid | Garden id. |

**Request body**

| Field | Type | Required | Constraint | Description |
| --- | --- | --- | --- | --- |
| `code` | string | yes | 1–16 chars | Human-readable plant code, unique per garden (e.g. SR-K01-001). |
| `zone_id` | uuid | no | nullable | Zone; must belong to the garden. |
| `grid_x` | number | no | nullable | Column coordinate of the cell in the virtual garden grid. |
| `grid_y` | number | no | nullable | Row coordinate of the cell in the virtual garden grid. |
| `status` | enum | no | one of: UNKNOWN, HEALTHY, WATCHING, SICK, DEAD; default `UNKNOWN` | Initial status; defaults to UNKNOWN (§4.7). |
| `planted_at` | date | no | nullable | Planting date (YYYY-MM-DD). |

**Example**

```json
{
  "code": "SR-K01-001",
  "zone_id": "{{zone_id}}",
  "grid_x": 1.5,
  "grid_y": 2.0,
  "status": "UNKNOWN",
  "planted_at": "2020-01-01"
}
```

**Success:** `201`

### `POST /api/gardens/{garden_id}/plants/bulk`

Generate many plants at once with sequential codes (SR-K01-001…), UC-04/§4.1.

**Auth:** Bearer token

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `garden_id` | uuid | Garden id. |

**Request body**

| Field | Type | Required | Constraint | Description |
| --- | --- | --- | --- | --- |
| `code_prefix` | string | yes | 1–12 chars | Prefix for generated codes; each plant becomes '{prefix}-{NNN}'. |
| `count` | integer | yes | 1.0–500.0 | How many plants to generate. |
| `zone_id` | uuid | no | nullable | Zone; must belong to the garden. |
| `start_index` | integer | no | ≥0.0; default `1` | First sequence number; codes are zero-padded (width ≥ 3). |
| `planted_at` | date | no | nullable | Planting date (YYYY-MM-DD). |

**Example**

```json
{
  "code_prefix": "SR-K01",
  "count": 10,
  "zone_id": "{{zone_id}}",
  "start_index": 1
}
```

**Success:** `201`

### `DELETE /api/plants/{plant_id}`

Delete Plant

**Auth:** Bearer token

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `plant_id` | uuid | Plant; must belong to the garden. |

**Success:** `204`

### `GET /api/plants/{plant_id}`

Get Plant

**Auth:** Bearer token

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `plant_id` | uuid | Plant; must belong to the garden. |

**Success:** `200`

### `PUT /api/plants/{plant_id}`

Update Plant

**Auth:** Bearer token

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `plant_id` | uuid | Plant; must belong to the garden. |

**Request body**

| Field | Type | Required | Constraint | Description |
| --- | --- | --- | --- | --- |
| `code` | string | no | 1–16 chars; nullable | Human-readable plant code, unique per garden. |
| `zone_id` | uuid | no | nullable | Zone; must belong to the garden. |
| `grid_x` | number | no | nullable | Column coordinate of the cell in the virtual garden grid. |
| `grid_y` | number | no | nullable | Row coordinate of the cell in the virtual garden grid. |
| `status` | enum | no | one of: UNKNOWN, HEALTHY, WATCHING, SICK, DEAD; nullable | New status; must be a legal §4.7 transition. |
| `planted_at` | date | no | nullable | Planting date (YYYY-MM-DD). |

**Example**

```json
{
  "status": "HEALTHY"
}
```

**Success:** `200`


## tags

Physical QR/Barcode tags: attach, replace (§4.5), and field scan-lookup.

### `POST /api/plants/{plant_id}/tags`

Link a physical QR/Barcode tag to a plant (one ACTIVE tag per plant).

**Auth:** Bearer token

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `plant_id` | uuid | Plant; must belong to the garden. |

**Request body**

| Field | Type | Required | Constraint | Description |
| --- | --- | --- | --- | --- |
| `tag_code` | string | yes | 1–32 chars | The code encoded in the QR/Barcode; globally unique. |
| `tag_type` | enum | no | one of: QR, BARCODE; default `QR` | QR or BARCODE. |

**Example**

```json
{
  "tag_code": "QR-SR-K01-001",
  "tag_type": "QR"
}
```

**Success:** `201`

### `GET /api/tags/lookup/{code}`

Field scan: resolve a tag_code to its plant, garden and recent history (UC-21).

**Auth:** Bearer token

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `code` | string | The scanned tag_code. |

**Success:** `200`

### `PUT /api/tags/{tag_id}/replace`

Retire a damaged/lost tag and attach a new ACTIVE one, keeping the audit trail (§4.5).

**Auth:** Bearer token

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `tag_id` | uuid | Tag id. |

**Request body**

| Field | Type | Required | Constraint | Description |
| --- | --- | --- | --- | --- |
| `tag_code` | string | yes | 1–32 chars | The code encoded in the QR/Barcode; globally unique. |
| `tag_type` | enum | no | one of: QR, BARCODE; default `QR` | QR or BARCODE. |

**Example**

```json
{
  "tag_code": "QR-SR-K01-001-NEW",
  "tag_type": "QR"
}
```

**Success:** `200`


## plant-logs

Field reports, timeline, offline-sync idempotency (UC-22/UC-25).

### `GET /api/plants/{plant_id}/logs`

List Logs

**Auth:** Bearer token

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `plant_id` | uuid | Plant; must belong to the garden. |

**Query parameters**

| Name | Type | Required | Constraint | Description |
| --- | --- | --- | --- | --- |
| `limit` | integer | no | 1–100; default `20` | Page size. |
| `offset` | integer | no | ≥0; default `0` | Rows to skip before the page. |

**Success:** `200`

### `POST /api/plants/{plant_id}/logs`

Create a field report (UC-22). Replaying the same client_uuid returns the
already-stored report with 200 instead of creating a duplicate (offline sync).

**Auth:** Bearer token

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `plant_id` | uuid | Plant; must belong to the garden. |

**Request body**

| Field | Type | Required | Constraint | Description |
| --- | --- | --- | --- | --- |
| `status` | enum | yes | one of: UNKNOWN, HEALTHY, WATCHING, SICK, DEAD | Reported plant status; must be a legal §4.7 transition. |
| `note` | string | no | ≤5000 chars; nullable | Free-text observation. |
| `images` | array<string> | no | ≤10 items | Photo object URLs (obtain via POST /api/uploads/presign). |
| `client_uuid` | uuid | no | nullable | Device-generated id; replaying the same value is idempotent (offline sync). |
| `client_created_at` | date-time | no | nullable | When the report was captured on the device. |

**Example**

```json
{
  "status": "SICK",
  "note": "Vàng lá nửa tán, nghi nấm",
  "images": [
    "https://minio.local/plant-photos/leaf.jpg"
  ],
  "client_uuid": "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
  "client_created_at": "2026-07-18T06:30:00Z"
}
```

**Success:** `201`

### `GET /api/plants/{plant_id}/timeline`

Plant history, newest first, with reporter names (UC-06/UC-23).

**Auth:** Bearer token

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `plant_id` | uuid | Plant; must belong to the garden. |

**Query parameters**

| Name | Type | Required | Constraint | Description |
| --- | --- | --- | --- | --- |
| `limit` | integer | no | 1–100; default `20` | Page size. |
| `offset` | integer | no | ≥0; default `0` | Rows to skip before the page. |

**Success:** `200`


## uploads

Pre-signed PUT URLs for plant photos (MinIO/S3).

### `POST /api/uploads/presign`

Pre-signed PUT URL for a plant photo; the client uploads directly to
MinIO/S3 and stores only the resulting object URL in the report.

**Auth:** Bearer token

**Request body**

| Field | Type | Required | Constraint | Description |
| --- | --- | --- | --- | --- |
| `content_type` | string | yes | — | MIME type of the photo, e.g. image/jpeg |
| `size_bytes` | integer | yes | — | Declared file size; refused above the limit |

**Example**

```json
{
  "content_type": "image/jpeg",
  "size_bytes": 204800
}
```

**Success:** `200`


## tasks

Work assignment and the PENDING→IN_PROGRESS→DONE/CANCELLED lifecycle.

### `GET /api/tasks`

Owner sees tasks across their gardens; staff see only tasks assigned to them.

**Auth:** Bearer token

**Query parameters**

| Name | Type | Required | Constraint | Description |
| --- | --- | --- | --- | --- |
| `garden_id` | uuid | no | nullable | Garden id. |
| `assignee_id` | uuid | no | nullable | STAFF member to assign the task to (must be one of your staff). |
| `status` | enum | no | one of: PENDING, IN_PROGRESS, DONE, CANCELLED; nullable | Status value; validated against the relevant state machine. |
| `limit` | integer | no | 1–100; default `20` | Page size. |
| `offset` | integer | no | ≥0; default `0` | Rows to skip before the page. |

**Success:** `200`

### `POST /api/tasks`

Owner creates and optionally assigns a task (UC-11).

**Auth:** Bearer token

**Request body**

| Field | Type | Required | Constraint | Description |
| --- | --- | --- | --- | --- |
| `garden_id` | uuid | yes | — | Garden id. |
| `type` | enum | yes | one of: WATER, FERTILIZE, SPRAY, INSPECT, HARVEST, OTHER | Kind of work: WATER/FERTILIZE/SPRAY/INSPECT/HARVEST/OTHER. |
| `plant_id` | uuid | no | nullable | Plant; must belong to the garden. |
| `assignee_id` | uuid | no | nullable | STAFF member to assign the task to (must be one of your staff). |
| `description` | string | no | ≤5000 chars; nullable | Free-text details. |
| `due_date` | date-time | no | nullable | Deadline (ISO 8601). |

**Example**

```json
{
  "garden_id": "{{garden_id}}",
  "type": "SPRAY",
  "plant_id": "{{plant_id}}",
  "assignee_id": "{{staff_id}}",
  "description": "Phun thuốc trị nấm, liều 20ml/16L",
  "due_date": "2026-07-20T11:00:00Z"
}
```

**Success:** `201`

### `GET /api/tasks/{task_id}`

Get Task

**Auth:** Bearer token

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `task_id` | uuid | Task id. |

**Success:** `200`

### `PUT /api/tasks/{task_id}`

Owner edits fields, reassigns, starts, or cancels a task.

**Auth:** Bearer token

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `task_id` | uuid | Task id. |

**Request body**

| Field | Type | Required | Constraint | Description |
| --- | --- | --- | --- | --- |
| `type` | enum | no | one of: WATER, FERTILIZE, SPRAY, INSPECT, HARVEST, OTHER; nullable | Item type (see the enum reference). |
| `plant_id` | uuid | no | nullable | Plant; must belong to the garden. |
| `assignee_id` | uuid | no | nullable | STAFF member to assign the task to (must be one of your staff). |
| `description` | string | no | ≤5000 chars; nullable | Free-text details. |
| `due_date` | date-time | no | nullable | Deadline (ISO 8601). |
| `status` | enum | no | one of: PENDING, IN_PROGRESS, DONE, CANCELLED; nullable | IN_PROGRESS or CANCELLED (use /complete to finish). |

**Example**

```json
{
  "assignee_id": "{{staff_id}}",
  "status": "CANCELLED"
}
```

**Success:** `200`

### `PUT /api/tasks/{task_id}/complete`

Assignee (or owner) finishes the task with proof photos; notifies the creator.

**Auth:** Bearer token

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `task_id` | uuid | Task id. |

**Request body**

| Field | Type | Required | Constraint | Description |
| --- | --- | --- | --- | --- |
| `proof_images` | array<string> | no | ≤10 items | Photo object URLs proving the task was done. |

**Example**

```json
{
  "proof_images": [
    "https://minio.local/plant-photos/done.jpg"
  ]
}
```

**Success:** `200`

### `PUT /api/tasks/{task_id}/start`

Assignee (or owner) marks the task in progress (UC-24).

**Auth:** Bearer token

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `task_id` | uuid | Task id. |

**Success:** `200`


## schedules

Recurring care schedules (cron) that auto-generate tasks (UC-10).

### `GET /api/gardens/{garden_id}/schedules`

List Schedules

**Auth:** Bearer token

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `garden_id` | uuid | Garden id. |

**Success:** `200`

### `POST /api/gardens/{garden_id}/schedules`

Create a recurring care schedule; cron_expr is validated (UC-10).

**Auth:** Bearer token

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `garden_id` | uuid | Garden id. |

**Request body**

| Field | Type | Required | Constraint | Description |
| --- | --- | --- | --- | --- |
| `type` | enum | yes | one of: WATER, FERTILIZE, SPRAY, INSPECT, HARVEST, OTHER | Kind of recurring work to generate. |
| `cron_expr` | string | yes | 1–50 chars | 5-field cron expression, e.g. '0 6 * * 1' = 06:00 every Monday. |
| `description` | string | no | ≤5000 chars; nullable | Free-text details. |
| `zone_id` | uuid | no | nullable | Zone; must belong to the garden. |
| `is_active` | boolean | no | default `True` | Whether the schedule is active (only active schedules generate tasks). |

**Example**

```json
{
  "type": "WATER",
  "cron_expr": "0 6 * * 1",
  "description": "Tưới 6h sáng thứ 2 hằng tuần",
  "zone_id": "{{zone_id}}",
  "is_active": true
}
```

**Success:** `201`

### `DELETE /api/schedules/{schedule_id}`

Delete Schedule

**Auth:** Bearer token

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `schedule_id` | uuid | Schedule id. |

**Success:** `204`

### `GET /api/schedules/{schedule_id}`

Get Schedule

**Auth:** Bearer token

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `schedule_id` | uuid | Schedule id. |

**Success:** `200`

### `PUT /api/schedules/{schedule_id}`

Update Schedule

**Auth:** Bearer token

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `schedule_id` | uuid | Schedule id. |

**Request body**

| Field | Type | Required | Constraint | Description |
| --- | --- | --- | --- | --- |
| `type` | enum | no | one of: WATER, FERTILIZE, SPRAY, INSPECT, HARVEST, OTHER; nullable | Item type (see the enum reference). |
| `cron_expr` | string | no | 1–50 chars; nullable | 5-field cron expression, e.g. '0 6 * * 1' = 06:00 every Monday. |
| `description` | string | no | ≤5000 chars; nullable | Free-text details. |
| `zone_id` | uuid | no | nullable | Zone; must belong to the garden. |
| `is_active` | boolean | no | nullable | Whether the schedule is active (only active schedules generate tasks). |

**Example**

```json
{
  "cron_expr": "0 18 * * 5",
  "is_active": true
}
```

**Success:** `200`


## notifications

Per-user notification inbox (task assigned / completed).

### `GET /api/notifications`

List Notifications

**Auth:** Bearer token

**Query parameters**

| Name | Type | Required | Constraint | Description |
| --- | --- | --- | --- | --- |
| `unread` | boolean | no | default `False` | When true, return only unread notifications. |
| `limit` | integer | no | 1–100; default `20` | Page size. |
| `offset` | integer | no | ≥0; default `0` | Rows to skip before the page. |

**Success:** `200`

### `POST /api/notifications/read-all`

Mark All Read

**Auth:** Bearer token

**Success:** `200`

### `GET /api/notifications/unread-count`

Unread Count

**Auth:** Bearer token

**Success:** `200`

### `PUT /api/notifications/{notification_id}/read`

Mark Read

**Auth:** Bearer token

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `notification_id` | uuid | Notification id. |

**Success:** `200`


## inventory

Supplies catalog + stock ledger (IN/OUT) with low-stock & expiry alerts (UC-12).

### `GET /api/gardens/{garden_id}/inventory`

List Items

**Auth:** Bearer token

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `garden_id` | uuid | Garden id. |

**Query parameters**

| Name | Type | Required | Constraint | Description |
| --- | --- | --- | --- | --- |
| `type` | enum | no | one of: FERTILIZER, PESTICIDE, TOOL, OTHER; nullable | Item type (see the enum reference). |
| `limit` | integer | no | 1–100; default `20` | Page size. |
| `offset` | integer | no | ≥0; default `0` | Rows to skip before the page. |

**Success:** `200`

### `POST /api/gardens/{garden_id}/inventory`

Create Item

**Auth:** Bearer token

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `garden_id` | uuid | Garden id. |

**Request body**

| Field | Type | Required | Constraint | Description |
| --- | --- | --- | --- | --- |
| `name` | string | yes | 1–100 chars | Supply name (e.g. 'Phân NPK 20-20-15'). |
| `type` | enum | yes | one of: FERTILIZER, PESTICIDE, TOOL, OTHER | Supply category: FERTILIZER / PESTICIDE / TOOL / OTHER. |
| `unit` | string | no | ≤20 chars; nullable | Unit of measure, e.g. 'kg', 'lít', 'bao'. |
| `min_quantity` | number | no | ≥0.0; default `0` | Low-stock threshold; a warning fires when quantity ≤ this (and > 0). |
| `expiry_date` | date | no | nullable | Expiry date (YYYY-MM-DD); drives the expiry warnings. |

**Example**

```json
{
  "name": "Phân NPK 20-20-15",
  "type": "FERTILIZER",
  "unit": "bao",
  "min_quantity": 5,
  "expiry_date": "2027-01-01"
}
```

**Success:** `201`

### `GET /api/gardens/{garden_id}/inventory/warnings`

Supplies running low, expiring soon, or already expired (UC-12 Cảnh báo tồn).

**Auth:** Bearer token

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `garden_id` | uuid | Garden id. |

**Success:** `200`

### `DELETE /api/inventory/{item_id}`

Delete Item

**Auth:** Bearer token

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `item_id` | uuid |  |

**Success:** `204`

### `GET /api/inventory/{item_id}`

Get Item

**Auth:** Bearer token

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `item_id` | uuid |  |

**Success:** `200`

### `PATCH /api/inventory/{item_id}`

Update Item

**Auth:** Bearer token

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `item_id` | uuid |  |

**Request body**

| Field | Type | Required | Constraint | Description |
| --- | --- | --- | --- | --- |
| `name` | string | no | 1–100 chars; nullable | Supply name. |
| `type` | enum | no | one of: FERTILIZER, PESTICIDE, TOOL, OTHER; nullable | Item type (see the enum reference). |
| `unit` | string | no | ≤20 chars; nullable | Unit of measure, e.g. 'kg', 'lít', 'bao'. |
| `min_quantity` | number | no | ≥0.0; nullable | Low-stock threshold; a warning fires when quantity ≤ this (and > 0). |
| `expiry_date` | date | no | nullable | Expiry date (YYYY-MM-DD); drives the expiry warnings. |

**Example**

```json
{
  "min_quantity": 10,
  "expiry_date": "2027-06-30"
}
```

**Success:** `200`

### `GET /api/inventory/{item_id}/transactions`

List Transactions

**Auth:** Bearer token

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `item_id` | uuid |  |

**Query parameters**

| Name | Type | Required | Constraint | Description |
| --- | --- | --- | --- | --- |
| `limit` | integer | no | 1–100; default `20` | Page size. |
| `offset` | integer | no | ≥0; default `0` | Rows to skip before the page. |

**Success:** `200`

### `POST /api/inventory/{item_id}/transactions`

Record a stock movement (IN adds, OUT subtracts). An OUT below zero is rejected.

**Auth:** Bearer token

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `item_id` | uuid |  |

**Request body**

| Field | Type | Required | Constraint | Description |
| --- | --- | --- | --- | --- |
| `direction` | enum | yes | one of: IN, OUT | IN (stock received) or OUT (stock used). |
| `quantity` | number | yes | — | Movement amount; must be > 0. IN adds to stock, OUT subtracts. |
| `note` | string | no | ≤1000 chars; nullable | Free-text observation. |

**Example**

```json
{
  "direction": "IN",
  "quantity": 20,
  "note": "Nhập kho đầu vụ"
}
```

**Success:** `201`


## harvests

Per-plant yield records and season / zone / quality rollups (UC-13).

### `GET /api/gardens/{garden_id}/harvest-stats`

Yield totals with season / zone / quality breakdowns (UC-13 Thống kê).

**Auth:** Bearer token

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `garden_id` | uuid | Garden id. |

**Success:** `200`

### `GET /api/plants/{plant_id}/harvests`

List Harvests

**Auth:** Bearer token

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `plant_id` | uuid | Plant; must belong to the garden. |

**Query parameters**

| Name | Type | Required | Constraint | Description |
| --- | --- | --- | --- | --- |
| `limit` | integer | no | 1–100; default `20` | Page size. |
| `offset` | integer | no | ≥0; default `0` | Rows to skip before the page. |

**Success:** `200`

### `POST /api/plants/{plant_id}/harvests`

Record a plant's yield (UC-13). Owner or assigned staff; reporter = caller.

**Auth:** Bearer token

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `plant_id` | uuid | Plant; must belong to the garden. |

**Request body**

| Field | Type | Required | Constraint | Description |
| --- | --- | --- | --- | --- |
| `quantity_kg` | number | yes | ≥0.0 | Harvested weight in kilograms (≥ 0). |
| `quality` | string | no | ≤20 chars; nullable | Quality grade, free text (e.g. 'loại 1'). |
| `season` | string | no | ≤30 chars; nullable | Season/batch label used to group yields (e.g. '2026-Hè'). |
| `harvested_at` | date | yes | — | Harvest date (YYYY-MM-DD). |

**Example**

```json
{
  "quantity_kg": 12.5,
  "quality": "loại 1",
  "season": "2026-Hè",
  "harvested_at": "2026-07-15"
}
```

**Success:** `201`


## trace

Traceability QR codes and the public consumer trace page (UC-14/UC-30).

### `GET /api/gardens/{garden_id}/trace-codes`

List Trace Codes

**Auth:** Bearer token

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `garden_id` | uuid | Garden id. |

**Query parameters**

| Name | Type | Required | Constraint | Description |
| --- | --- | --- | --- | --- |
| `limit` | integer | no | 1–100; default `20` | Page size. |
| `offset` | integer | no | ≥0; default `0` | Rows to skip before the page. |

**Success:** `200`

### `POST /api/gardens/{garden_id}/trace-codes`

Mint a traceability QR code for a batch spanning one or more of the garden's plants.

**Auth:** Bearer token

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `garden_id` | uuid | Garden id. |

**Request body**

| Field | Type | Required | Constraint | Description |
| --- | --- | --- | --- | --- |
| `plant_ids` | array<uuid> | yes | — | Plants whose fruit is in this batch; every id must belong to the garden. |
| `batch_name` | string | no | ≤100 chars; nullable | Human-readable batch label. |
| `harvest_date` | date | no | nullable | Batch harvest date (YYYY-MM-DD). |
| `public_info` | object | no | — | Owner-curated fields shown to consumers (variety, certifications, care notes). |

**Example**

```json
{
  "plant_ids": [
    "{{plant_id}}"
  ],
  "batch_name": "Lô A-2026",
  "harvest_date": "2026-07-15",
  "public_info": {
    "certification": "VietGAP",
    "variety": "Sầu riêng Monthong"
  }
}
```

**Success:** `201`

### `DELETE /api/trace-codes/{trace_code_id}`

Delete Trace Code

**Auth:** Bearer token

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `trace_code_id` | uuid |  |

**Success:** `204`

### `GET /api/trace-codes/{trace_code_id}`

Get Trace Code

**Auth:** Bearer token

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `trace_code_id` | uuid |  |

**Success:** `200`

### `PATCH /api/trace-codes/{trace_code_id}`

Update Trace Code

**Auth:** Bearer token

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `trace_code_id` | uuid |  |

**Request body**

| Field | Type | Required | Constraint | Description |
| --- | --- | --- | --- | --- |
| `batch_name` | string | no | ≤100 chars; nullable | Human-readable batch label. |
| `harvest_date` | date | no | nullable | Batch harvest date (YYYY-MM-DD). |
| `public_info` | object | no | nullable | Owner-curated fields shown to consumers (variety, certifications, care notes). |

**Example**

```json
{
  "public_info": {
    "certification": "VietGAP",
    "note": "Không thuốc hóa học"
  }
}
```

**Success:** `200`

### `GET /api/trace/{code}`

Public consumer traceability page (UC-30) — no authentication required.

**Auth:** Public

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `code` | string | The scanned tag_code. |

**Success:** `200`


## stats

Dashboard snapshot: status breakdown, stale plants, per-zone counts, weekly trend, and early-warning alerts (UC-07).

### `GET /api/gardens/{garden_id}/stats`

Dashboard snapshot: status breakdown, stale plants, per-zone counts, weekly
trend, and early-warning alerts (UC-07).

**Auth:** Bearer token

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `garden_id` | uuid | Garden id. |

**Success:** `200`


## ai

AI garden-health summary (UC-08) and leaf-photo disease diagnosis (UC-26). Rate-limited; the default providers are deterministic and need no API key.

### `POST /api/ai/diagnose`

Leaf-photo disease diagnosis (UC-26). Owner or assigned staff; rate-limited.
The result is advisory only (confidence + disclaimer). Default provider is a
deterministic fake needing no API key; diagnoses attach to the plant timeline.

**Auth:** Bearer token

**Request body**

| Field | Type | Required | Constraint | Description |
| --- | --- | --- | --- | --- |
| `plant_log_id` | uuid | yes | — | The plant log (field report) whose photo should be diagnosed. |
| `image_url` | string | yes | ≤500 chars | One of that log's image URLs to analyze (must be in the log's images). |

**Example**

```json
{
  "plant_log_id": "{{plant_log_id}}",
  "image_url": "https://minio.local/plant-photos/leaf.jpg"
}
```

**Success:** `200`

### `POST /api/ai/summarize`

AI-written garden-health summary + highlighted plants (UC-08). Owner only,
rate-limited. The default provider is deterministic and needs no API key.

**Auth:** Bearer token

**Request body**

| Field | Type | Required | Constraint | Description |
| --- | --- | --- | --- | --- |
| `garden_id` | uuid | yes | — | Garden to summarize (must be one of yours). |
| `window_days` | integer | no | 1.0–90.0; default `7` | Look-back window in days for the report comparison (1–90; default 7). |

**Example**

```json
{
  "garden_id": "{{garden_id}}",
  "window_days": 7
}
```

**Success:** `200`

