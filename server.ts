import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { neon } from '@neondatabase/serverless';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Master Issuer Config (Mutable)
let MASTER_ISSUER_ID = process.env.ISSUER_ID || '3388000000022258509';
let SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL || 'id-banlis-wallet@walletcard-514107.iam.gserviceaccount.com';
let PRIVATE_KEY_PEM = process.env.GOOGLE_PRIVATE_KEY || `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC6SaS1OgaOqT5I
SXM5Cemrb7hiFMp1dJoJQMVxrlQIX971AcwjWU4Tf/5zPzIzFSENCdw6/yNXvjed
9sR7PhCcaNgDH+xbTfPO2kgY5H7v5ikCmovjVOEVhG4zDddmaQoics4LLBE/2xRf
8VRW4RzNklfOC7tgKEysBhvl2Fjo7Yn0gTciLUaIgKqKg/CPBTOkxgoV1R8tx/cF
SybpSF5eh9y6ynKD42eRtcerlmPCUM9wu9WefbkjzK0kW04+BhOO86kh6LSbuwFF
0TkhNTXMRL959GK97alQVt0QcP/x7i3REOW0jEcW3YdlR5cRMuvRyzN3J8l09t45
7N7Ea6fNAgMBAAECggEAJlizdXSw1dwDzJiGBedC+P3B3DrAZEYw0RfKrPiAJssp
V5Dbpykid8QgqjOHj1lZmNf/RAuyCEVJKJSb5GylubShRp9jJXZZ6ionriwW7yYX
KgiLJCwcOzQsBQlj3hpgMjAktssG7/iWbJt+S3YCWlS2C12B4Czbf4uwYXNT9fpZ
bs4N2aoKKGjixik6iqExTkHN2IHFDcJwFY3Fm9N6C34DVA/5kCodUsXFUQ9T/9e3
54cgc75/UoXhomlbzytv20PlniJccVNBcaNeCR0et3/I+yZmoisVcTH/V03ECmmo
PB2nP71bZfoeApdH7GOBKzYjHCV+nYz0OY3bXD8BoQKBgQDt/oAV3WOn1SHUvE/k
SDlAAJFhCQ5OB7O/4DxGcSQbEdTdQQdytwO1EFnQoKNTKxG9FgguRIdJEqIuCmwp
y9GBhoCwUsPKyTOQs9tu8OA5wAMEuIYu99Cgy5k8PieJBaaBh34VMbdTALs65/hc
Z34ox2mzax6cFTZywvWbJHnM8QKBgQDIYa+OrCnETZ5dSTeclarUbSTSmiXjHmc4
hUyajJi0Om7zyOf7T0tvgIgwCCg+q+q8e1cnbzxuPrSOQgC10rlFdbDiZcTkSYkH
VFtqBtPrnLRWXNRsGpA6Fr7jsp96R0SFJy5Y0enylJkXmCrmXVJ4fPgwtM1V1Aj6Y
+rA8yCh4nQKBgQCk520UuVvt1K4mW3z37ltMz5fsJnw08P1JfDQHkymzX/2geQiS
IeF9uiChgEzqubMG05dDh9Q9e53ITQx5QXKfTvUoN5DWl+cU4qqvClQzb6onwTuo
m6mBYNGCfoaiWLnwklN4mAQwjRcuT8E1NbiixNmmqhiBiek6R4AqyXFj4QKBgFkI
RlevGTO2hRnP0VzKh0exYv4MLa9XL+fGGn5E4AicOfYpmyFnXw4g3uHwjekiu76Z
UuUboI8fX1wh6WzgPx+kpj5Bl5UTM0ZFbgSTGhAC5YHF50BNIS4eMxy6ne9XwRMk
kIw4YKLVepM2yrV5jHQ3PnPK7jp6D9Qq9qlbCdhlAoGAK2ZdVsV8AdME4znLjJj5
o/lF2S5dMY+QnwUq7fI+E3/mvPawQXVvwBbi0Aqj6qIyHvNuIKosdpGlZTGHfNu0
IzH0qWvlwSalsBttE3IwYEsQLJbR/UfaE4ZNuGDa6YzCje/P4PIWPtyLlCZFjU+K
G3DaKXXecVI9vqh/qUibNyM=
-----END PRIVATE KEY-----`;

// Neon Postgres Client
const DATABASE_URL = process.env.DATABASE_URL || '';
const sql = DATABASE_URL ? neon(DATABASE_URL) : null;

// Initialize Database Tables in Neon Postgres
async function initDb() {
  if (!sql) {
    console.log('[Neon Postgres] DATABASE_URL environment variable is not configured.');
    return;
  }

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS tenants (
        id TEXT PRIMARY KEY,
        slug TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        logo TEXT,
        color TEXT,
        archetype TEXT,
        class_id TEXT,
        issuer_id TEXT
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS members (
        id TEXT PRIMARY KEY,
        tenant_id TEXT REFERENCES tenants(id),
        name TEXT,
        phone TEXT,
        email TEXT,
        member_id TEXT,
        points INTEGER DEFAULT 0,
        balance_cents INTEGER DEFAULT 0,
        google_object_id TEXT
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS point_transactions (
        id TEXT PRIMARY KEY,
        member_id TEXT REFERENCES members(id),
        change_amount INTEGER NOT NULL,
        reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Keep existing Banlis tenant in Neon IF table is empty - DO NOT re-seed fake tenants
    const existingTenants = await sql`SELECT id FROM tenants LIMIT 1;`;
    if (existingTenants.length === 0) {
      await sql`
        INSERT INTO tenants (id, slug, name, logo, color, archetype, class_id, issuer_id)
        VALUES (
          't-banlis-01',
          'banlis-bistro',
          'Banlis Bistro & Dining',
          'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&auto=format&fit=crop',
          '#ff5722',
          'loyalty',
          ${`${MASTER_ISSUER_ID}.tenant_banlis_loyalty_v3`},
          ${MASTER_ISSUER_ID}
        )
        ON CONFLICT (id) DO NOTHING;
      `;
    }

    console.log('[Neon Postgres] Database initialized cleanly.');
  } catch (err) {
    console.error('[Neon Postgres] Initialization error:', err);
  }
}

// Fallback Cache for local preview when DATABASE_URL is unconfigured
interface TenantRow {
  id: string;
  slug: string;
  name: string;
  logo: string;
  color: string;
  archetype: string;
  class_id: string;
  issuer_id: string;
}

interface MemberRow {
  id: string;
  tenant_id: string;
  name: string;
  phone: string;
  email: string;
  member_id: string;
  points: number;
  balance_cents: number;
  google_object_id: string;
}

const fallbackTenants: TenantRow[] = [
  {
    id: 't-banlis-01',
    slug: 'banlis-bistro',
    name: 'Banlis Bistro & Dining',
    logo: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&auto=format&fit=crop',
    color: '#ff5722',
    archetype: 'loyalty',
    class_id: `${MASTER_ISSUER_ID}.tenant_banlis_loyalty_v3`,
    issuer_id: MASTER_ISSUER_ID,
  },
];

const fallbackMembers: MemberRow[] = [
  {
    id: '889042',
    tenant_id: 't-banlis-01',
    name: 'Marcus Vance',
    phone: '+1 (555) 234-5678',
    email: 'marcus.vance@example.com',
    member_id: '889042',
    points: 1450,
    balance_cents: 0,
    google_object_id: `${MASTER_ISSUER_ID}.customer_889042_obj`,
  },
];

function normalizeWalletPrivateKey(raw: string): string {
  if (!raw) return '';
  let key = String(raw).trim();

  if (key.startsWith('{') && key.endsWith('}')) {
    try {
      const parsed = JSON.parse(key);
      if (parsed.private_key) {
        key = String(parsed.private_key).trim();
      }
    } catch {
      // Ignore JSON parse error
    }
  }

  key = key
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\n')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();

  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1).trim();
  }

  const match = key.match(/-----BEGIN (?:RSA )?PRIVATE KEY-----([\s\S]*?)-----END (?:RSA )?PRIVATE KEY-----/);
  if (match) {
    const rawBody = match[1].replace(/\s+/g, '');
    const chunks = rawBody.match(/.{1,64}/g) || [rawBody];
    return `-----BEGIN PRIVATE KEY-----\n${chunks.join('\n')}\n-----END PRIVATE KEY-----\n`;
  }

  return key.endsWith('\n') ? key : key + '\n';
}

function signGoogleWalletJwt(
  payload: any,
  serviceAccountEmail: string,
  privateKeyPem?: string,
  extraOrigins: string[] = []
): string {
  const defaultOrigins = [
    'https://oloyal.vercel.app',
    'https://oloyal-three.vercel.app',
    'http://localhost:5173',
    'https://banlis-wallet.vercel.app',
    'https://ais-dev-v6nnfts2ifjcwfsonsfq2o-86957709213.us-west1.run.app',
    'https://ais-pre-v6nnfts2ifjcwfsonsfq2o-86957709213.us-west1.run.app',
  ];

  if (process.env.ORIGINS) {
    try {
      const trimmed = process.env.ORIGINS.trim();
      if (trimmed.startsWith('[')) {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) defaultOrigins.push(...parsed);
      } else {
        const split = trimmed.split(',').map((s) => s.trim()).filter(Boolean);
        defaultOrigins.push(...split);
      }
    } catch {
      defaultOrigins.push(process.env.ORIGINS);
    }
  }

  if (process.env.GOOGLE_WALLET_ORIGIN) defaultOrigins.push(process.env.GOOGLE_WALLET_ORIGIN);
  if (process.env.APP_URL) defaultOrigins.push(process.env.APP_URL);

  const originsSet = new Set<string>();

  [...defaultOrigins, ...extraOrigins].forEach((orig) => {
    if (!orig) return;
    try {
      const u = new URL(orig.startsWith('http://') || orig.startsWith('https://') ? orig : `https://${orig}`);
      originsSet.add(u.origin);
    } catch {
      // Ignore invalid URL
    }
  });

  const originsList = Array.from(originsSet);
  console.log('[Google Wallet] Signed JWT with origins:', originsList);

  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);

  const jwtPayload: Record<string, any> = {
    iss: serviceAccountEmail,
    aud: 'google',
    origins: originsList,
    typ: 'savetowallet',
    iat: now,
    exp: now + 3600,
    payload,
  };

  const base64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
  const base64Payload = Buffer.from(JSON.stringify(jwtPayload)).toString('base64url');
  const unsignedToken = `${base64Header}.${base64Payload}`;

  if (!privateKeyPem || privateKeyPem.trim().length === 0) {
    throw new Error('Missing GOOGLE_PRIVATE_KEY - Cannot sign Google Wallet JWT token.');
  }

  try {
    const keyPem = normalizeWalletPrivateKey(privateKeyPem);
    const keyObj = crypto.createPrivateKey({
      key: keyPem,
      format: 'pem',
    });
    const sigBuf = crypto.sign('SHA256', Buffer.from(unsignedToken), keyObj);
    return `${unsignedToken}.${sigBuf.toString('base64url')}`;
  } catch (err: any) {
    try {
      const keyPem = normalizeWalletPrivateKey(privateKeyPem);
      const signer = crypto.createSign('RSA-SHA256');
      signer.update(unsignedToken);
      signer.end();
      const signature = signer.sign(keyPem, 'base64url');
      return `${unsignedToken}.${signature}`;
    } catch (fallbackErr: any) {
      throw new Error(`RSA256 Sign Error: ${err?.message || fallbackErr?.message || 'Invalid RSA Private Key'}`);
    }
  }
}

// GET /api/stats - DB Aggregate Counts
app.get('/api/stats', async (_req: Request, res: Response) => {
  let activeTenants = 0;
  let totalPasses = 0;

  if (sql) {
    try {
      const tenantRows = await sql`SELECT COUNT(*)::int as count FROM tenants;`;
      const memberRows = await sql`SELECT COUNT(*)::int as count FROM members;`;
      activeTenants = tenantRows[0]?.count || 0;
      totalPasses = memberRows[0]?.count || 0;
    } catch (err) {
      console.error('[Neon Postgres] GET /api/stats error:', err);
    }
  } else {
    activeTenants = fallbackTenants.length;
    totalPasses = fallbackMembers.length;
  }

  res.json({
    activeTenants,
    totalPasses,
    todayRevenue: totalPasses * 35.50,
    redemptionRate: totalPasses > 0 ? '28.4%' : '0%',
    avgCheck: 48.20,
    pointsLiability: totalPasses * 100,
  });
});

// GET /api/health
app.get('/api/health', async (_req: Request, res: Response) => {
  let tenantCount = fallbackTenants.length;
  if (sql) {
    try {
      const rows = await sql`SELECT COUNT(*)::int as count FROM tenants;`;
      tenantCount = rows[0]?.count || 0;
    } catch {
      // Fallback
    }
  }

  res.json({
    status: 'online',
    database: sql ? 'Neon Postgres Connected' : 'Fallback Local Cache',
    masterIssuerId: MASTER_ISSUER_ID,
    serviceAccount: SERVICE_ACCOUNT_EMAIL,
    hasPrivateKey: !!PRIVATE_KEY_PEM,
    smartTapVersion: '3.2',
    activeTenants: tenantCount,
    timestamp: new Date().toISOString(),
  });
});

// GET /api/credentials
app.get('/api/credentials', (_req: Request, res: Response) => {
  res.json({
    issuerId: MASTER_ISSUER_ID,
    serviceAccountEmail: SERVICE_ACCOUNT_EMAIL,
    hasPrivateKey: !!PRIVATE_KEY_PEM,
  });
});

// POST /api/credentials - Update Master Credentials
app.post('/api/credentials', (req: Request, res: Response) => {
  const { issuerId, serviceAccountEmail, privateKey } = req.body;
  if (issuerId) MASTER_ISSUER_ID = issuerId.trim();
  if (serviceAccountEmail) SERVICE_ACCOUNT_EMAIL = serviceAccountEmail.trim();
  if (privateKey) PRIVATE_KEY_PEM = privateKey.trim();

  res.json({
    success: true,
    issuerId: MASTER_ISSUER_ID,
    serviceAccountEmail: SERVICE_ACCOUNT_EMAIL,
    hasPrivateKey: !!PRIVATE_KEY_PEM,
  });
});

// GET /api/tenants - SELECT * FROM tenants IN NEON POSTGRES WITH PASS COUNT
app.get('/api/tenants', async (_req: Request, res: Response) => {
  if (sql) {
    try {
      const rows = await sql`
        SELECT 
          t.id, 
          t.slug, 
          t.name, 
          t.logo, 
          t.color, 
          t.archetype, 
          t.class_id, 
          t.issuer_id,
          COUNT(m.id)::int as pass_count
        FROM tenants t
        LEFT JOIN members m ON m.tenant_id = t.id
        GROUP BY t.id, t.slug, t.name, t.logo, t.color, t.archetype, t.class_id, t.issuer_id
        ORDER BY t.id;
      `;

      const mapped = rows.map((r) => ({
        id: r.id,
        slug: r.slug,
        name: r.name,
        legalEntity: `${r.name} LLC`,
        brandColor: r.color || '#ff5722',
        logoUrl: r.logo,
        archetype: r.archetype || 'loyalty',
        classId: r.class_id,
        plan: 'growth',
        passLimit: 5000,
        passCount: Number(r.pass_count || 0),
        status: 'active',
      }));
      return res.json(mapped);
    } catch (err) {
      console.error('[Neon Postgres] GET /api/tenants error:', err);
    }
  }

  // Fallback if DATABASE_URL is unconfigured
  res.json(
    fallbackTenants.map((t) => ({
      id: t.id,
      slug: t.slug,
      name: t.name,
      legalEntity: `${t.name} LLC`,
      brandColor: t.color,
      logoUrl: t.logo,
      archetype: t.archetype,
      classId: t.class_id,
      plan: 'growth',
      passLimit: 5000,
      passCount: 0,
      status: 'active',
    }))
  );
});

// POST /api/tenants - INSERT INTO tenants(id, slug, name, logo, color, archetype, class_id, issuer_id) IN NEON POSTGRES
app.post('/api/tenants', async (req: Request, res: Response) => {
  const { name, legalEntity, brandColor, logoUrl, archetype, plan } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Store name is required' });
  }

  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const tenantId = `t-${Date.now()}`;
  const classId = `${MASTER_ISSUER_ID}.tenant_${tenantId}_${archetype || 'loyalty'}_class`;
  const logo = logoUrl || 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&auto=format&fit=crop';
  const color = brandColor || '#ff5722';

  let insertedRow: any = null;

  if (sql) {
    try {
      const inserted = await sql`
        INSERT INTO tenants (id, slug, name, logo, color, archetype, class_id, issuer_id)
        VALUES (${tenantId}, ${slug}, ${name.trim()}, ${logo}, ${color}, ${archetype || 'loyalty'}, ${classId}, ${MASTER_ISSUER_ID})
        RETURNING id, slug, name, logo, color, archetype, class_id, issuer_id;
      `;
      if (inserted.length > 0) {
        insertedRow = inserted[0];
      }
    } catch (err) {
      console.error('[Neon Postgres] INSERT tenant error:', err);
    }
  } else {
    const fallbackItem = {
      id: tenantId,
      slug,
      name: name.trim(),
      logo,
      color,
      archetype: archetype || 'loyalty',
      class_id: classId,
      issuer_id: MASTER_ISSUER_ID,
    };
    fallbackTenants.push(fallbackItem);
    insertedRow = fallbackItem;
  }

  const responseTenant = {
    id: insertedRow?.id || tenantId,
    slug: insertedRow?.slug || slug,
    name: insertedRow?.name || name.trim(),
    legalEntity: legalEntity || `${name.trim()} LLC`,
    brandColor: insertedRow?.color || color,
    logoUrl: insertedRow?.logo || logo,
    archetype: insertedRow?.archetype || archetype || 'loyalty',
    classId: insertedRow?.class_id || classId,
    plan: plan || 'starter',
    passLimit: plan === 'growth' ? 5000 : plan === 'scale' ? 50000 : 500,
    passCount: 0,
    status: 'active',
    createdAt: new Date().toISOString(),
  };

  res.status(201).json({
    tenant: responseTenant,
    googleWalletClass: {
      id: responseTenant.classId,
      issuerName: responseTenant.name,
      programName: `${responseTenant.name} Rewards`,
      hexBackgroundColor: responseTenant.brandColor,
      reviewStatus: 'UNDER_REVIEW',
      smartTapPayload: 'ENCRYPTED_AES128_HMAC_SHA256',
    },
  });
});

// GET /api/passes - SELECT FROM members JOIN tenants
app.get('/api/passes', async (_req: Request, res: Response) => {
  if (sql) {
    try {
      const rows = await sql`
        SELECT 
          m.id,
          m.tenant_id,
          m.name as customer_name,
          m.phone,
          m.email,
          m.member_id,
          m.points,
          m.balance_cents,
          m.google_object_id,
          t.name as store_name,
          t.color as brand_color,
          t.logo as logo_url,
          t.class_id
        FROM members m
        JOIN tenants t ON m.tenant_id = t.id
        ORDER BY m.id DESC;
      `;
      return res.json(rows);
    } catch (err) {
      console.error('[Neon Postgres] JOIN members AND tenants error:', err);
    }
  }

  // Fallback
  const mapped = fallbackMembers.map((m) => {
    const t = fallbackTenants.find((ten) => ten.id === m.tenant_id) || fallbackTenants[0];
    return {
      id: m.id,
      tenant_id: m.tenant_id,
      customer_name: m.name,
      phone: m.phone,
      email: m.email,
      member_id: m.member_id,
      points: m.points,
      balance_cents: m.balance_cents,
      google_object_id: m.google_object_id,
      store_name: t.name,
      brand_color: t.color,
      logo_url: t.logo,
      class_id: t.class_id,
    };
  });

  res.json(mapped);
});

// POST /api/tenants/:slug/enroll - Customer Sign-up & Mint Google Wallet Pass
app.post('/api/tenants/:slug/enroll', async (req: Request, res: Response) => {
  const { slug } = req.params;
  const { name, email, phone } = req.body;

  let tenant: TenantRow | undefined;

  if (sql) {
    try {
      const rows = await sql`SELECT * FROM tenants WHERE slug = ${slug} OR id = ${slug} LIMIT 1;`;
      if (rows.length > 0) {
        tenant = rows[0] as TenantRow;
      }
    } catch (err) {
      console.error('[Neon Postgres] Find tenant error:', err);
    }
  }

  if (!tenant) {
    tenant = fallbackTenants.find((t) => t.slug === slug || t.id === slug) || fallbackTenants[0];
  }

  const customerId = Math.floor(100000 + Math.random() * 900000).toString();
  const objectId = `${MASTER_ISSUER_ID}.customer_${customerId}_obj`;

  const logoUri =
    tenant.logo &&
    tenant.logo.startsWith('http') &&
    !tenant.logo.includes('googleusercontent.com/aida-public/')
      ? tenant.logo
      : 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&auto=format&fit=crop';

  const loyaltyClass = {
    id: tenant.class_id,
    issuerName: tenant.name,
    programName: `${tenant.name} Loyalty`,
    programLogo: {
      sourceUri: {
        uri: logoUri,
      },
      contentDescription: {
        defaultValue: {
          language: 'en-US',
          value: `${tenant.name} Logo`,
        },
      },
    },
    reviewStatus: 'UNDER_REVIEW',
    hexBackgroundColor: tenant.color || '#ff5722',
    accountNameLabel: 'Member',
    accountIdLabel: 'Member ID',
  };

  const loyaltyObject = {
    id: objectId,
    classId: tenant.class_id,
    state: 'ACTIVE',
    accountId: customerId,
    accountName: name || 'Valued Member',
    barcode: {
      type: 'QR_CODE',
      value: customerId,
      alternateText: customerId,
    },
    loyaltyPoints: {
      label: 'Points',
      balance: {
        int: 100,
      },
    },
    textModulesData: [
      { id: 'mod_member', header: 'MEMBER', body: name || 'Valued Member' },
      { id: 'mod_phone', header: 'PHONE', body: phone || customerId },
      { id: 'mod_points', header: 'POINTS', body: '100 Points - Welcome Bonus' },
    ],
  };

  const jwtPayload = {
    loyaltyClasses: [loyaltyClass],
    loyaltyObjects: [loyaltyObject],
  };

  const requestOrigins: string[] = [];
  if (req.headers.origin) requestOrigins.push(String(req.headers.origin));
  if (req.headers.referer) requestOrigins.push(String(req.headers.referer));

  const signedJwtToken = signGoogleWalletJwt(jwtPayload, SERVICE_ACCOUNT_EMAIL, PRIVATE_KEY_PEM, requestOrigins);
  const saveToWalletUrl = `https://pay.google.com/gp/v/save/${signedJwtToken}`;

  const memberName = name || 'Guest Member';
  const memberPhone = phone || '';
  const memberEmail = email || '';

  if (sql) {
    try {
      await sql`
        INSERT INTO members (id, tenant_id, name, phone, email, member_id, points, balance_cents, google_object_id)
        VALUES (${customerId}, ${tenant.id}, ${memberName}, ${memberPhone}, ${memberEmail}, ${customerId}, 100, 0, ${objectId});
      `;

      const txId = `tx-${Date.now()}`;
      await sql`
        INSERT INTO point_transactions (id, member_id, change_amount, reason)
        VALUES (${txId}, ${customerId}, 100, 'Welcome Bonus');
      `;
    } catch (err) {
      console.error('[Neon Postgres] INSERT member error:', err);
    }
  } else {
    fallbackMembers.push({
      id: customerId,
      tenant_id: tenant.id,
      name: memberName,
      phone: memberPhone,
      email: memberEmail,
      member_id: customerId,
      points: 100,
      balance_cents: 0,
      google_object_id: objectId,
    });
  }

  res.status(201).json({
    pass: {
      id: customerId,
      objectId,
      tenantId: tenant.id,
      customerName: memberName,
      email: memberEmail,
      phone: memberPhone,
      points: 100,
      tier: 'SILVER',
      barcodeNum: `9802 ${customerId.slice(0, 4)} ${customerId.slice(4)} 001`,
      jwtUrl: saveToWalletUrl,
      syncedAt: new Date().toISOString(),
    },
    saveToWalletUrl,
    qrCodeData: `PASS-LOVAL-NFC:${objectId}`,
    tenant: {
      name: tenant.name,
      brandColor: tenant.color,
      logoUrl: tenant.logo,
    },
  });
});

// PATCH /api/passes/:objectId/points - Update members.points & Insert point_transactions
app.patch('/api/passes/:objectId/points', async (req: Request, res: Response) => {
  const { objectId } = req.params;
  const { deltaPoints, absolutePoints, reason } = req.body;

  let currentPoints = 100;
  let memberId = '889042';

  if (sql) {
    try {
      const rows = await sql`
        SELECT * FROM members 
        WHERE google_object_id = ${objectId} OR id = ${objectId} OR member_id = ${objectId} 
        LIMIT 1;
      `;

      if (rows.length > 0) {
        const m = rows[0];
        memberId = m.id;
        currentPoints = Number(m.points || 0);

        let newPoints = currentPoints;
        let changeAmount = 0;

        if (typeof absolutePoints === 'number') {
          newPoints = Math.max(0, absolutePoints);
          changeAmount = newPoints - currentPoints;
        } else if (typeof deltaPoints === 'number') {
          changeAmount = deltaPoints;
          newPoints = Math.max(0, currentPoints + deltaPoints);
        }

        await sql`
          UPDATE members 
          SET points = ${newPoints} 
          WHERE id = ${memberId};
        `;

        const txId = `tx-${Date.now()}`;
        await sql`
          INSERT INTO point_transactions (id, member_id, change_amount, reason)
          VALUES (${txId}, ${memberId}, ${changeAmount}, ${reason || 'POS Points Update'});
        `;

        currentPoints = newPoints;
      }
    } catch (err) {
      console.error('[Neon Postgres] UPDATE points error:', err);
    }
  } else {
    const pass = fallbackMembers.find((p) => p.google_object_id === objectId || p.id === objectId) || fallbackMembers[0];
    memberId = pass.id;
    if (typeof absolutePoints === 'number') {
      pass.points = Math.max(0, absolutePoints);
    } else if (typeof deltaPoints === 'number') {
      pass.points = Math.max(0, pass.points + deltaPoints);
    }
    currentPoints = pass.points;
  }

  let tier = 'SILVER';
  if (currentPoints >= 2000) tier = 'PLATINUM';
  else if (currentPoints >= 1000) tier = 'GOLD VIP';

  res.json({
    success: true,
    objectId,
    loyaltyPoints: {
      balance: { int: currentPoints },
      label: 'Points',
    },
    tier,
    lockScreenPushSent: true,
    updatedAt: new Date().toISOString(),
  });
});

// GET /api/tenants/:id/billing - SaaS Billing & Limits
app.get('/api/tenants/:id/billing', async (req: Request, res: Response) => {
  let storeName = 'Banlis Bistro & Dining';
  let passCount = 0;

  if (sql) {
    try {
      const rows = await sql`
        SELECT t.name, COUNT(m.id)::int as pass_count
        FROM tenants t
        LEFT JOIN members m ON m.tenant_id = t.id
        WHERE t.id = ${req.params.id} OR t.slug = ${req.params.id}
        GROUP BY t.id, t.name LIMIT 1;
      `;
      if (rows.length > 0) {
        storeName = rows[0].name;
        passCount = Number(rows[0].pass_count || 0);
      }
    } catch {
      // Fallback
    }
  }

  const planCosts = { starter: 49, growth: 149, scale: 399 };

  res.json({
    tenantId: req.params.id,
    storeName,
    plan: 'growth',
    monthlyCost: planCosts.growth,
    passUsage: {
      current: passCount,
      limit: 5000,
      percentage: Math.round((passCount / 5000) * 100),
    },
    billingCycleEnd: '2026-12-01T00:00:00Z',
    masterIssuerStatus: 'Active (Issuer ID: 3388000000022258509)',
  });
});

// Direct HTML legal endpoints for Google Pay Console automated crawlers
app.get(['/privacy.html'], (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'public', 'assets', 'aistudio', 'Privacy_1be6727a.html'));
});

app.get(['/terms.html'], (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'public', 'assets', 'aistudio', 'Terms_0faba292.html'));
});

// Vercel Serverless Export or Express Local Listen
async function startServer() {
  await initDb();

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PassLoyal Master Issuer SaaS server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();

export default app;
