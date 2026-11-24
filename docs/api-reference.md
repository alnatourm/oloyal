# PassLoyal OS API Reference — Dual Mobile Wallet Pass Issuance Engine

**Service:** PassLoyal OS (oloyal) · Loyalty & digital wallet engine for Middle East merchants
**Scope of this document:** Wallet pass issuance engine (Apple Wallet / Google Wallet) plus the supporting public endpoints used by the customer enrollment flow
**Audience:** Backend engineers, mobile integrators, and technical reviewers of the OTECH architecture blueprints

---

## 1. Overview

The PassLoyal OS API is a single Express service (`server.ts` + `api/index.ts`) that backs the dual mobile wallet pass issuance engine:

- **Apple Wallet** — pass generation in the Apple Wallet PassKit pass format (the JSON pass model consumed by PassKit tooling to build `.pkpass` payloads).
- **Google Wallet** — Loyalty Class + Loyalty Object issuance via the Google Wallet Objects API, using **JWT-based Wallet "Save to Wallet"** (Smart Tap) authorization (JWT `typ: "savetowallet"`).

The service also exposes tenant/member management, loyalty points, coupons, geo-campaigns, analytics and billing endpoints used by the merchant console. This reference focuses first on the wallet issuance surface, then indexes the rest.

### 1.1 Runtime facts

| Property | Value |
|---|---|
| API framework | Express 4 (`express.json({ limit: '10mb' })`) |
| App entry | `server.ts` (Express + Vite middleware; serves `dist/` SPA) |
| Local dev server | `http://localhost:3000` (`npm run dev` → `tsx server.ts`) |
| Production hosts | `https://oloyal.vercel.app`, `https://oloyal-three.vercel.app`, `https://banlis-wallet.vercel.app`, `https://ais-dev-*.us-west1.run.app` |
| Database | Neon PostgreSQL (`@neondatabase/serverless`); `DATABASE_URL` (null ⇒ fallback/demo mode) |
| Master Issuer ID | `3388000000022258509` (env `ISSUER_ID`) |
| Google service account | `oloyal-wallet-sa@banlis-bistro-app.iam.gserviceaccount.com` (env `GOOGLE_SERVICE_ACCOUNT_EMAIL` / `GOOGLE_CLIENT_EMAIL`) |
| Wallet encryption/Smart Tap version | `3.2` (`smartTapVersion`) |
| Apple pass type identifier | `pass.space.o-tech.loyalty` |
| Apple team identifier | `OTECH77DEV` |
| Apple organization (default) | `PassLoyal Middle East` |

### 1.2 Wallet issuer configuration

- The Google Wallet private key is loaded from `GOOGLE_PRIVATE_KEY` / `GOOGLE_PRIVATE_KEY_PEM` (normalized via `normalizeWalletPrivateKey` — requires the `BEGIN PRIVATE KEY` PEM block).
- Issuer/service-account/key overrides are persisted by the Super Admin via `GET/POST /api/credentials` into the `platform_settings` table and hot-applied (`MASTER_ISSUER_ID`, `SERVICE_ACCOUNT_EMAIL`, `PRIVATE_KEY_PEM`).
- Google OAuth token (JWT bearer) is exchanged at `https://oauth2.googleapis.com/token` with scope `https://www.googleapis.com/auth/wallet_object.issuer` to obtain an access token used for Wallet Object REST calls.

---

## 2. Authentication

| Item | Detail |
|---|---|
| Scheme | HMAC-SHA256 signed token: `<base64url(body)>.<base64url(sig)>`, or `Authorization: Bearer <token>` / `x-auth-token` |
| Claims | `{ role, tenantId?, tenantSlug?, email?, tv?, iat, exp }` (`role`: `super_admin` \| `admin` \| `merchant`) |
| Token lifetime | 12h default (`AUTH_TOKEN_TTL_SECONDS`, min 300s) |
| Secret source | `AUTH_SECRET` \| `SESSION_SECRET` \| `JWT_SECRET` \| derived fallback |
| Super admin | Env `SUPER_ADMIN_EMAIL` + `ADMIN_PASSWORD_HASH` (bcrypt) |
| Tenant gate | `requireActiveTenant` re-checks tenant `status` + `token_version` on every merchant-scoped request; suspended/rejected/pending tenants are blocked |
| Partner (POS) auth | `x-api-key: pk_live_<key>` resolved through `resolveRequestAuth` (tenant bound, 300s token) |

---

## 3. Error Handling

All errors use a JSON envelope:

```json
{ "error": "Human readable message" }
```

| HTTP | Meaning |
|---|---|
| 400 | Validation failure (e.g. missing member/customer name, missing store slug) |
| 401 | Missing/invalid session token, expired token, wrong tenant |
| 403 | Tenant not found for the caller, store not active for enrollment (suspended/rejected/pending), plan pass limit reached |
| 404 | Resource not found (member not found, store not found) |
| 409 | Duplicate tenant (store name/email) |
| 429 | Rate limit exceeded |
| 500 | Database / internal failure |

---

## 4. Rate Limits

Rate limiting uses a Postgres-backed atomic counter via Neon (in-process Map fallback when DB is unavailable).

| Scope key | Limit | Window |
|---|---|---|
| `login:<ip>:<email>` | 15 | 5 min |
| `forgot:<ip>:<email>` / `reset:<ip>:<email>` | 5 | 15 min |
| `register:<ip>` | 10 | 60 min |
| `members:<ip>:<tenantId>` (pass issuance) | 600 | 60 min |
| `enroll:<ip>:<slug>` (customer enrollment) | 25 | 5 min |

---

## 5. Dual Mobile Wallet Pass Issuance Engine

### 5.1 Apple Wallet — PassKit pass generation

**Endpoint:** `GET /api/passes/apple/:memberId`

Generates the Apple Wallet pass for a loyalty member in the **PassKit pass JSON format** (the payload consumed to produce a `.pkpass` file), with a QR barcode for in-store redemption.

#### 5.1.1 Request

| Part | Value |
|---|---|
| Method | `GET` |
| Path param | `memberId` — loyalty member code (`PL-XXXXXX`) or internal member UUID |
| Auth | None (public redemption payload); tenant inactive check not applied on this route |
| Content-Type | — (JSON response) |

#### 5.1.2 Response — `200 OK` (PassKit pass payload)

```json
{
  "formatVersion": 1,
  "passTypeIdentifier": "pass.space.o-tech.loyalty",
  "serialNumber": "PL-482913",
  "teamIdentifier": "OTECH77DEV",
  "organizationName": "Banlis Coffee & Bakery",
  "description": "Banlis Coffee & Bakery Digital Loyalty Card",
  "foregroundColor": "rgb(255, 255, 255)",
  "backgroundColor": "rgb(24, 25, 28)",
  "labelColor": "rgb(255, 87, 34)",
  "logoText": "Banlis Coffee & Bakery",
  "storeCard": {
    "primaryFields": [{ "key": "balance", "label": "POINTS", "value": 100 }],
    "secondaryFields": [{ "key": "tier", "label": "TIER", "value": "Silver" }],
    "auxiliaryFields": [{ "key": "cardholder", "label": "CARDHOLDER", "value": "Loyalty Member" }],
    "backFields": [
      { "key": "memberId", "label": "MEMBER ID", "value": "PL-482913" },
      { "key": "phone", "label": "PHONE", "value": "+962 7 123 4567" },
      { "key": "region", "label": "REGION", "value": "Middle East (MENA)" },
      { "key": "terms", "label": "PROGRAM DETAILS", "value": "Redeemable at all participating locations across the Middle East." }
    ]
  },
  "barcodes": [
    { "format": "PKBarcodeFormatQR", "message": "PASS-LOYAL:PL-482913", "messageEncoding": "iso-8859-1" }
  ]
}
```

Response headers: `Content-Type: application/json`, `Content-Disposition: inline; filename="pass-<memberId>.json"`.

| Field | Description |
|---|---|
| `formatVersion` | PassKit format version (`1`) |
| `passTypeIdentifier` | Apple pass type identifier registered to the OTECH Wallet team (`pass.space.o-tech.loyalty`) |
| `serialNumber` | Pass serial — loyalty member code (`PL-XXXXXX`) or internal member id |
| `teamIdentifier` | Apple Developer Team ID (`OTECH77DEV`) |
| `organizationName` | Merchant display name |
| `storeCard` | Wallet store card fields: primary (points balance), secondary (tier), auxiliary (cardholder), back (member id / phone / region / terms) |
| `barcodes` | Redemption barcode: `PKBarcodeFormatQR` with message `PASS-LOYAL:<memberId>`, encoding `iso-8859-1` |

#### 5.1.3 Error responses

| Status | Condition |
|---|---|
| `400` | `memberId` missing/blank |
| `404` | Member not found |
| `500` | Pass generation failure |

When no database is configured, the endpoint returns a demo pass payload (member id supplied via `:memberId`) — used by the interactive wallet preview.

---

### 5.2 Google Wallet — JWT Smart Tap pass issuance

**Endpoint:** `POST /api/tenants/:slug/enroll`

Creates a loyalty member, applies the welcome bonus, builds the Google Wallet `LoyaltyClass` + `LoyaltyObject`, signs a **Save to Wallet JWT** (RS256), and returns the `https://pay.google.com/gp/v/save/<jwt>` URL for the customer to add the pass to Google Wallet.

#### 5.2.1 Flow

1. Rate limit: `enroll:<ip>:<slug>` → **25 enrollments / 5 min / IP+slug**.
2. `ensureMigration()`; requires database (`sql`).
3. Resolve tenant by `:slug` (or tenant id for admins).
4. Reject tenants in `suspended` / `rejected` / `pending` / `pending approval` status (`403`).
5. Enforce tenant plan `pass_limit` (Starter 500 · Growth 5,000 · Scale 50,000 passes) — exceeded ⇒ `403` with upgrade guidance.
6. Create member: `member_id = PL-<6 digits>`, internal uuid, linked `google_object_id = <issuerId>.customer_<memberCode>_obj`.
7. Apply welcome bonus (`program_configs.welcome_active` / `welcome_grant`, overridable per request via `initialPoints`) and write a `point_transactions` row (`Welcome Bonus`).
8. Compute tier from configured tiers (`computeTierFromRules`: Silver base, Gold mid, VIP Plat — configurable via `program_configs.tiers_json`).
9. Build `LoyaltyClass` (`reviewStatus: UNDER_REVIEW`, program name, logo, hex background color, geo locations) and `LoyaltyObject` (barcode type `CODE_128` or `QR_CODE` based on `barcode_mode`, loyalty points balance, text modules).
10. Sign Save-to-Wallet JWT (RS256, 1h expiry, audience `google`, typ `savetowallet`, allowed origins) and return the save URL.

#### 5.2.2 Request body

```json
{
  "name": "Customer Full Name",
  "email": "customer@example.com",
  "phone": "+962 7 123 4567",
  "initialPoints": 100
}
```

| Field | Required | Notes |
|---|---|---|
| `name` | Yes | Member/customer name — missing ⇒ `400 { "error": "Customer name is required" }` |
| `email` | No | |
| `phone` | No | |
| `initialPoints` | No | Overrides the tenant welcome grant |

#### 5.2.3 Response — `201 Created`

```json
{
  "success": true,
  "member": { "id": "mem-...", "tenant_id": "...", "name": "...", "member_id": "PL-482913", "points": 100, "tier": "Silver" },
  "pass": {
    "id": "mem-...",
    "objectId": "3388000000022258509.customer_PL-482913_obj",
    "tenantId": "...",
    "customerName": "...",
    "email": "",
    "phone": "",
    "points": 100,
    "tier": "Silver",
    "jwtUrl": "https://pay.google.com/gp/v/save/<signed-jwt>",
    "appleWalletUrl": "/api/passes/apple/PL-482913",
    "syncedAt": "2026-11-24T09:21:33.000Z"
  },
  "saveToWalletUrl": "https://pay.google.com/gp/v/save/<signed-jwt>",
  "walletUrl": "https://pay.google.com/gp/v/save/<signed-jwt>",
  "appleWalletUrl": "/api/passes/apple/PL-482913",
  "qr": "PL-482913",
  "qrCodeData": "PASS-LOVAL-NFC:<loyaltyObjectId>",
  "tenant": { "id": "...", "slug": "banlis", "name": "Banlis Coffee & Bakery", "brandColor": "#ff5722", "logoUrl": "..." }
}
```

#### 5.2.4 Save to Google Wallet JWT structure

```
<base64url(JWS header)>.<base64url(JWT payload)>.<base64url(RS256 signature)>
```

- Header: `{ "alg": "RS256", "typ": "JWT" }`
- Payload:

```json
{
  "iss": "oloyal-wallet-sa@banlis-bistro-app.iam.gserviceaccount.com",
  "aud": "google",
  "origins": ["https://oloyal.vercel.app", "http://localhost:5173", "...(APP_URL / GOOGLE_WALLET_ORIGIN / ORIGINS)"],
  "typ": "savetowallet",
  "iat": 1764000000,
  "exp": 1764003600,
  "payload": {
    "loyaltyClasses": [ { "id": "...", "issuerName": "...", "programName": "...", "programLogo": { "sourceUri": { "uri": "..." } }, "reviewStatus": "UNDER_REVIEW", "hexBackgroundColor": "#ff5722", "accountNameLabel": "Member", "accountIdLabel": "Member ID", "locations": [{ "latitude": 31.95, "longitude": 35.93 }] } ],
    "loyaltyObjects": [ { "id": "...", "classId": "...", "state": "ACTIVE", "accountId": "PL-482913", "accountName": "Customer Full Name", "barcode": { "type": "QR_CODE", "value": "PL-482913", "alternateText": "PL-482913" }, "loyaltyPoints": { "label": "Points", "balance": { "int": 100 } }, "textModulesData": [{ "id": "mod_member", "header": "MEMBER", "body": "Customer Full Name" }] } ]
  }
}
```

- Signed with the service-account RSA private key; save URL: `https://pay.google.com/gp/v/save/<jwt>`

#### 5.2.5 Error responses

| Status | Condition |
|---|---|
| `400` | Customer name required / validation failure |
| `403` | Store not active for enrollment, or plan pass limit reached |
| `404` | Tenant not found for slug |
| `429` | Enrollment rate limit exceeded (`Retry-After` semantics via `retryAfterSec`) |
| `500` | Database failure during enrollment |

---

### 5.3 Public tenant lookup — customer self-service

**Endpoint:** `GET /api/public/tenants/:slug`

Public (no session) lookup used by the customer enrollment join links (`?store=<slug>` / `?slug=<slug>` / `view=enroll`). Returns the public-facing loyalty program configuration for a store.

#### 5.3.1 Request

| Part | Value |
|---|---|
| Method | `GET` |
| Path param | `slug` — tenant slug (e.g. `banlis`) or tenant id |

#### 5.3.2 Response — `200 OK`

```json
{
  "slug": "banlis",
  "name": "Banlis Coffee & Bakery",
  "brandColor": "#ff5722",
  "logoUrl": "...",
  "archetype": "loyalty",
  "programName": "Banlis Coffee & Bakery Club",
  "cardTitle": "Banlis Coffee & Bakery Membership Card",
  "barcodeMode": "qr",
  "welcomeActive": true,
  "welcomeGrant": 100,
  "tiers": [
    { "name": "Bronze", "minPoints": 0 },
    { "name": "Silver", "minPoints": 500 },
    { "name": "Gold", "minPoints": 1500 }
  ]
}
```

| Field | Description |
|---|---|
| `slug` / `name` / `brandColor` / `logoUrl` | Store identity and branding |
| `archetype` | Pass archetype: `loyalty` \| `gift` \| `ticket` |
| `programName` / `cardTitle` | Loyalty program and pass card titles |
| `barcodeMode` | `barcode` (Code 128) \| `qr` |
| `welcomeActive` / `welcomeGrant` | Self-service welcome bonus |
| `tiers` | Tier thresholds exposed for the enrollment UI |

#### 5.3.3 Error responses

| Status | Condition |
|---|---|
| `400` | Store slug required |
| `403` | Store loyalty program inactive (suspended / rejected) |
| `404` | Store not found |
| `500` | Failed to load store enrollment info |

---

### 5.4 Wallet credential management (Super Admin)

| Endpoint | Auth | Purpose |
|---|---|---|
| `GET /api/credentials` | Super Admin | Read current Google Wallet issuer id / service account / key presence |
| `POST /api/credentials` | Super Admin | Update issuer id, service account email and private key (persisted in `platform_settings`) |

---

### 5.5 Wallet balance sync

- `PATCH /api/passes/:objectId/points` — sync loyalty points to an existing Google Wallet object (`handleMemberPointsUpdate` / pass-level points handlers).
- `POST /api/members/:id/points` and `PATCH /api/members/:id/points` — manual/absolute points adjustments with tenant scoping.
- Wallet REST calls: `PATCH /walletobjects/v1/loyaltyObject/<objectId>` (`loyaltyPoints.balance.int`) and `POST /walletobjects/v1/loyaltyObject/<objectId>/addMessage` (`messageType: TEXT_AND_NOTIFY`).

---

## 6. Wallet-related endpoint index

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/health` | Public | Service + DB + issuer status, Smart Tap version |
| `GET` | `/api/public/tenants/:slug` | Public | Public store lookup (enrollment) |
| `GET` | `/api/passes/apple/:memberId` | Public | Apple Wallet PassKit pass payload |
| `POST` | `/api/tenants/:slug/enroll` | Public / Merchant | Google Wallet save-to-JWT enrollment |
| `GET` | `/api/tenants/:id/billing` | Merchant | Tenant plan, pass usage vs. limit |
| `POST` | `/api/tenants/:slug/upgrade-request` | Merchant | Request plan upgrade |
| `GET` | `/api/tenants/:slug/members` | Merchant | List members for store |
| `GET` | `/api/members` | Merchant | List members (admin: by `?slug=`; merchant: own tenant) |
| `POST` | `/api/members` | Merchant | Issue member pass (internal issuance path; enforces tenant via auth or `pk_live_` key) |
| `GET` | `/api/members/:id` | Merchant | Member lookup |
| `PATCH` | `/api/members/:id` | Merchant | Update member |
| `DELETE` | `/api/members/:id` | Merchant | Delete member |
| `GET` | `/api/members/:id/transactions` | Merchant | Points ledger |
| `POST` | `/api/members/:id/send-alert` | Merchant | Push/geo alert to member |
| `GET` | `/api/tenants` | Merchant/SUPER_ADMIN | Tenant list (merchant: own; super admin: all, `?status=` filter) |
| `POST` | `/api/tenants` | Public/Merchant | Register / provision tenant |
| `PATCH` / `PUT` | `/api/tenants/:slug` | Merchant/SUPER_ADMIN | Update tenant |
| `DELETE` | `/api/tenants/:slug` | Super Admin | Delete tenant |
| `GET` | `/api/program-config` | Merchant | Read program config (program name, barcode mode, tiers, welcome) |
| `PUT` | `/api/program-config` | Merchant | Publish pass template config |
| `GET` | `/api/coupons` | Merchant | List coupons |
| `POST` | `/api/coupons` | Merchant | Create coupon |
| `PATCH` | `/api/coupons/:id` / `DELETE` | Merchant | Update / delete coupon |
| `GET` | `/api/geo-campaigns` | Merchant | Geo campaigns (beacon/proximity) |
| `POST` | `/api/geo-campaigns` / `PATCH` / `DELETE` | Merchant | Geo campaign CRUD; `POST /api/geo-campaigns/test-push` |
| `GET` | `/api/analytics` | Merchant | Tenant-scoped analytics, tier distribution, ledger |
| `GET` | `/api/stats` | — | Platform stats |
| `GET` | `/api/admin/profile` | Super Admin | Admin profile |
| `GET` | `/auth/me` | Bearer | Session validation |
| `POST` | `/auth/login` | Public | Merchant / Super Admin sign-in |
| `POST` | `/auth/forgot-password` | Public | Forgot password |
| `POST` | `/auth/reset-password` | Public | Reset password |

Unmatched `/api/*` routes return `404 { "error": "API endpoint not found" }`.

---

## 7. Example: end-to-end pass lifecycle

```text
Merchant signs up
   │ POST /api/tenants            → tenant provisioned (status: Pending Approval)
   │ POST /api/tenants/:slug/enroll   (or internal POST /api/members)  → member + LoyaltyObject + Save JWT
   │ GET  /api/passes/apple/:memberId → Apple pass payload
   │ Customer opens https://…/customer-join?store=<slug>
   │   → GET /api/public/tenants/:slug (program info)
   │   → POST /api/tenants/:slug/enroll (enroll) → saveToWalletUrl / appleWalletUrl / qr
   │ Google Wallet: open saveToWalletUrl → Save to Google Wallet (Smart Tap)
   │ Apple Wallet: pass payload → build .pkpass → add to Apple Wallet
   │ POS cashier scans QR / NFC → member lookup → points ledger update → wallet sync
```

---

## 8. OpenAPI / code-level source of truth

The authoritative implementation lives in:

- `api/index.ts` — all routes, wallet issuance logic, tier computation, rate limits.
- `server.ts` — Express/Vite hosting, middleware order, startup.
- `src/utils/i18n.ts` — regional data (dial codes, currencies) consumed by enrollment UI.
- `src/views/PassStudioView.tsx`, `src/views/CashierView.tsx`, `src/views/CustomerEnrollmentView.tsx` — client-side consumers of these endpoints.

---

*PassLoyal OS documentation set: [localization-guide.md](./localization-guide.md) · [merchant-guide.md](./merchant-guide.md)*
