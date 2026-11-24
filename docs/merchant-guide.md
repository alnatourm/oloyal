# PassLoyal OS — Merchant Onboarding & Terminal Setup Guide

**Scope:** Step-by-step onboarding for restaurant and retail loyalty operators, plus POS terminal / wallet pass delivery setup.
**Related docs:** [api-reference.md](./api-reference.md) · [localization-guide.md](./localization-guide.md)

---

## 1. Who this guide is for

- Restaurant operators (restaurants, cafes, food trucks, event venues) and retail chains that want to run a loyalty program.
- Teams configuring the **PassLoyal OS** merchant console: Dashboard, Pass Studio, POS Cashier, Customers CRM, Push & Geo Studio, Customer Enrollment, Store Onboarding, Analytics, Billing.

## 2. Onboarding sequence

### Step 1 — Sign-up / store provisioning

1. The merchant opens the console and registers the store.
2. Registration flow writes a tenant record (`tenants` table) with status `Pending Approval` initially (Super Admin provisions the package).
3. The merchant signs in via the console (email + password; bcrypt-hashed store password).
4. Super Admin approves the store; the merchant selects / is assigned a plan:

| Plan | Pass limit | Monthly | Annual | Highlights |
|---|---|---|---|---|
| **Starter Retailer** | 500 passes | $49 | $39 | Master Issuer provisioning, 1 location, Google Wallet "Add to Wallet" button, standard QR barcode scans, email support |
| **Growth Chain** | 5,000 passes | $149 | $119 | LoyaltyClass automation, up to 5 locations, Google Smart Tap v3.2 NFC encrypted, real-time POS webhook sync (PATCH), lock-screen proximity beacons, priority support |
| **Enterprise Franchise** | 50,000 passes | $399 | $319 | Dedicated Master Issuer sub-account, unlimited locations, custom enrollment domain, dedicated account manager, custom POS integration engineering, SLA 99.99% |

### Step 2 — Store onboarding wizard (4 steps)

The wizard (`Store Onboarding`) walks the operator through:

1. **Store Profile** — merchant identity, store name, owner details, slug.
2. **Card Template Builder** — wallet pass card title, subtitle / program club name, visual identity (swatches, colors).
3. **Loyalty Rules, Tiers & Coupons Cockpit** — loyalty tiers, welcome bonus, coupons, redemption rules.
4. **Provisioning & Create Live Cards** — create the live loyalty pass and prepare issuance.

### Step 3 — Loyalty tiers and program rules

- Default tiers: **Silver** (base rate), **Gold (Mid)** (1.25×), **VIP Plat** (1.5×) — thresholds and multipliers configurable via `program_configs.tiers_json`.
- Welcome bonus: default **100 points** (`welcome_grant`), can be switched off / overridden.
- Barcode mode per program: `barcode` (Code 128) or `qr` — configured via the card builder / program config.

### Step 4 — Pass Studio: design and publish

- Choose archetype: **Loyalty** | **Gift Card** | **Admission Ticket**.
- Configure pass template (program name, colors, fields, proximity beacon, etc.).
- **Publish to Fleet** — persists via `PUT /api/program-config`; publishes the LoyaltyClass for the tenant.

### Step 5 — Customer enrollment and pass delivery

- Customers open the merchant's customer enrollment surface (e.g. `/customer-join?store=<slug>`).
- The system resolves the public store config via `GET /api/public/tenants/:slug`, then enrolls via `POST /api/tenants/:slug/enroll` (or internal `POST /api/members`).
- The customer receives:
  - **Google Wallet:** `saveToWalletUrl` (`https://pay.google.com/gp/v/save/<signed JWT>`) → customer taps to add to Google Wallet (Smart Tap).
  - **Apple Wallet:** `/api/passes/apple/<memberCode>` → PassKit pass payload → `.pkpass` → add to Apple Wallet.
  - **Loyalty code / QR:** member code `PL-<6 digits>` (barcode value or QR payload).

---

## 3. Terminal setup: QR codes, NFC Smart Tap, and POS cashier

### 3.1 Prerequisites

- Growth plan or above for NFC (Google Smart Tap v3.2 encrypted) capability; Starter for QR scans.
- Google Wallet credentials provisioned by Super Admin (issuer id / service account / private key).

### 3.2 Customer-facing pass delivery

| Channel | Mechanism |
|---|---|
| Google Wallet | "Add to Google Wallet" deep link from `saveToWalletUrl` (signed JWT, `typ: savetowallet`) |
| Apple Wallet | PassKit pass payload from `GET /api/passes/apple/:memberId` (serial `PL-XXXXXX`, QR `PASS-LOYAL:<memberId>`) |
| QR code | Barcode value = member code; type `CODE_128` or `QR_CODE` per program config |

### 3.3 POS terminal — cashier flow

- Open the **POS Cashier** console (`pos-cashier`).
- Tender types: **NFC pass**, **EMV**, **Cash**.
- Actions:
  - **Scan Pass** — optical scan (camera) of the customer barcode / member code.
  - **NFC Pass** — tap-to-redeem using Google Smart Tap.
  - Member lookup fallback: type customer name / phone or scan `PL-XXXXXX`.
- On redemption: points ledger update (`members` / `point_transactions`) and wallet sync (`PATCH /api/passes/:objectId/points`).

### 3.4 NFC Smart Tap configuration

- Issuer configuration: Smart Tap version `3.2`, encrypted payload `ENCRYPTED_AES128_HMAC_SHA256`.
- Wallet objects: LoyaltyClass per tenant (`<issuerId>.tenant_<tenantId>_<archetype>_class`), LoyaltyObject per member.
- Sync: real-time POS webhook sync (balance PATCH) + optional lock-screen proximity geo-beacons (geo-campaigns).

---

## 4. Operational checklist for merchants

- [ ] Store registered and approved (Super Admin).
- [ ] Plan selected with sufficient pass limit for expected member volume.
- [ ] Onboarding wizard completed (profile, card template, rules, provisioning).
- [ ] Loyalty tiers / welcome bonus configured.
- [ ] Pass Studio template published ("Published to Fleet").
- [ ] Wallet credentials active (Google issuer provisioned; Apple team/token configured).
- [ ] Customer enrollment link (`?store=<slug>`) distributed to customers.
- [ ] POS cashier tender modes configured (NFC for Growth+, QR for Starter).
- [ ] Geo-beacon / push campaigns configured (optional).

---

*Part of the PassLoyal OS documentation set: [api-reference.md](./api-reference.md) · [localization-guide.md](./localization-guide.md)*
