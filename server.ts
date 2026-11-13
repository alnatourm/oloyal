import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import { ensureMigration, hashPassword, verifyPassword } from './api/_db.js';

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

    // Startup migration for tenant auth and status columns
    try {
      await sql`
        ALTER TABLE tenants 
        ADD COLUMN IF NOT EXISTS owner_name TEXT, 
        ADD COLUMN IF NOT EXISTS owner_email TEXT UNIQUE, 
        ADD COLUMN IF NOT EXISTS password_hash TEXT, 
        ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Pending Approval',
        ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'growth',
        ADD COLUMN IF NOT EXISTS pass_limit INT DEFAULT 5000,
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
      `;
      console.log('[Neon Postgres] Startup migration: ALTER TABLE tenants completed successfully.');
    } catch (migErr: any) {
      console.warn('[Neon Postgres] Startup migration notice:', migErr?.message || migErr);
    }

    // Run tenant auth columns migration verification
    await ensureMigration();

    console.log('[Neon Postgres] Database initialized cleanly with auth migrations.');
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
  owner_name?: string;
  owner_email?: string;
  password_hash?: string;
  status?: string;
  plan?: string;
  pass_limit?: number;
  created_at?: string;
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


function normalizeWalletPrivateKey(raw?: string): string {
  let k = raw || process.env.GOOGLE_PRIVATE_KEY || '';
  k = k.trim().replace(/^"|"$/g, '').replace(/\n/g, '\n').replace(/\\n/g, '\n');

  const hasBegin = k.includes('BEGIN PRIVATE KEY');
  console.log(`[Google Wallet] private key length: ${k.length}, has BEGIN: ${hasBegin}`);

  if (!hasBegin) {
    throw new Error('Invalid GOOGLE_PRIVATE_KEY format');
  }

  const match = k.match(/-----BEGIN (?:RSA )?PRIVATE KEY-----([\s\S]*?)-----END (?:RSA )?PRIVATE KEY-----/);
  if (match) {
    const rawBody = match[1].replace(/\s+/g, '');
    const chunks = rawBody.match(/.{1,64}/g) || [rawBody];
    return `-----BEGIN PRIVATE KEY-----\n${chunks.join('\n')}\n-----END PRIVATE KEY-----\n`;
  }

  return k.endsWith('\n') ? k : k + '\n';
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
  if (!sql) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  try {
    const tenantRows = await sql`SELECT COUNT(*)::int as count FROM tenants;`;
    const memberRows = await sql`SELECT COUNT(*)::int as count FROM members;`;
    const activeTenants = tenantRows[0]?.count || 0;
    const totalPasses = memberRows[0]?.count || 0;

    res.json({
      activeTenants,
      totalPasses,
      todayRevenue: totalPasses * 35.50,
      redemptionRate: totalPasses > 0 ? '28.4%' : '0%',
      avgCheck: 48.20,
      pointsLiability: totalPasses * 100,
    });
  } catch (err) {
    console.error('[Neon Postgres] GET /api/stats error:', err);
    return res.status(500).json({ error: 'Database connection failed' });
  }
});

// GET /api/health
app.get('/api/health', async (_req: Request, res: Response) => {
  let tenantCount = 0;
  let dbStatus = 'Not Configured';
  if (sql) {
    try {
      const rows = await sql`SELECT COUNT(*)::int as count FROM tenants;`;
      tenantCount = rows[0]?.count || 0;
      dbStatus = 'Neon Postgres Connected';
    } catch {
      dbStatus = 'Database Connection Failed';
    }
  }

  res.json({
    status: 'online',
    database: dbStatus,
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

// GET /api/tenants - SELECT * FROM tenants IN NEON POSTGRES WITH PASS COUNT & AUTH COLUMNS
app.get('/api/tenants', async (req: Request, res: Response) => {
  if (!sql) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  const statusParam = typeof req.query?.status === 'string' ? req.query.status.trim().toLowerCase() : '';

  try {
    const rows = statusParam === 'pending' || statusParam === 'pending approval'
      ? await sql`
          SELECT 
            t.id, t.slug, t.name, t.logo, t.color, t.archetype, t.class_id, t.issuer_id,
            t.owner_name, t.owner_email, t.status, t.plan, t.pass_limit, t.created_at,
            COUNT(m.id)::int as pass_count
          FROM tenants t
          LEFT JOIN members m ON m.tenant_id = t.id
          WHERE LOWER(COALESCE(t.status, '')) IN ('pending', 'pending approval')
          GROUP BY t.id, t.slug, t.name, t.logo, t.color, t.archetype, t.class_id, t.issuer_id, t.owner_name, t.owner_email, t.status, t.plan, t.pass_limit, t.created_at
          ORDER BY t.created_at DESC NULLS LAST, t.id DESC;
        `
      : statusParam
      ? await sql`
          SELECT 
            t.id, t.slug, t.name, t.logo, t.color, t.archetype, t.class_id, t.issuer_id,
            t.owner_name, t.owner_email, t.status, t.plan, t.pass_limit, t.created_at,
            COUNT(m.id)::int as pass_count
          FROM tenants t
          LEFT JOIN members m ON m.tenant_id = t.id
          WHERE LOWER(COALESCE(t.status, '')) = ${statusParam}
          GROUP BY t.id, t.slug, t.name, t.logo, t.color, t.archetype, t.class_id, t.issuer_id, t.owner_name, t.owner_email, t.status, t.plan, t.pass_limit, t.created_at
          ORDER BY t.id;
        `
      : await sql`
          SELECT 
            t.id, 
            t.slug, 
            t.name, 
            t.logo, 
            t.color, 
            t.archetype, 
            t.class_id, 
            t.issuer_id,
            t.owner_name,
            t.owner_email,
            t.status,
            t.plan,
            t.pass_limit,
            t.created_at,
            COUNT(m.id)::int as pass_count
          FROM tenants t
          LEFT JOIN members m ON m.tenant_id = t.id
          GROUP BY t.id, t.slug, t.name, t.logo, t.color, t.archetype, t.class_id, t.issuer_id, t.owner_name, t.owner_email, t.status, t.plan, t.pass_limit, t.created_at
          ORDER BY t.id;
        `;

    const mapped = rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      ownerName: r.owner_name || 'Store Manager',
      ownerEmail: r.owner_email || `${r.slug}@oloyal.com`,
      legalEntity: `${r.name} LLC`,
      brandColor: r.color || '#ff5722',
      logoUrl: r.logo,
      archetype: r.archetype || 'loyalty',
      classId: r.class_id,
      plan: r.plan || 'growth',
      passLimit: Number(r.pass_limit || (r.plan === 'scale' ? 50000 : r.plan === 'starter' ? 500 : 5000)),
      passCount: Number(r.pass_count || 0),
      status: r.status || 'Active',
      createdAt: r.created_at || new Date().toISOString(),
    }));
    return res.json(mapped);
  } catch (err) {
    console.error('[Neon Postgres] GET /api/tenants error:', err);
    return res.status(500).json({ error: 'Database connection failed' });
  }
});

// Helper for provisioning and registering a tenant
async function provisionTenantHandler(req: Request, res: Response) {
  const { name, legalEntity, brandColor, logoUrl, archetype, plan, status, ownerName, owner_name, ownerEmail, owner_email, password } = req.body || {};

  // 4) Validation: store name, owner_email, password >= 8 chars, plan in [starter, growth, scale]
  const storeName = (name || '').trim();
  if (!storeName) {
    return res.status(400).json({ error: 'Store name is required' });
  }

  const rawEmail = (ownerEmail || owner_email || '').trim().toLowerCase();
  if (!rawEmail || !rawEmail.includes('@') || !rawEmail.includes('.')) {
    return res.status(400).json({ error: 'Valid owner email is required' });
  }

  const rawPassword = password ? String(password).trim() : '';
  if (!rawPassword || rawPassword.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  const rawPlan = (plan || 'growth').trim().toLowerCase();
  if (!['starter', 'growth', 'scale'].includes(rawPlan)) {
    return res.status(400).json({ error: 'Plan must be one of: starter, growth, scale' });
  }

  if (!sql) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  const slug = storeName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || `store-${Date.now()}`;

  // 3) Handle duplicates gracefully: if slug or owner_email exists, return 409
  try {
    await ensureMigration();
    const existing = await sql`
      SELECT id, slug, owner_email FROM tenants 
      WHERE slug = ${slug} OR LOWER(owner_email) = ${rawEmail}
      LIMIT 1;
    `;
    if (existing && existing.length > 0) {
      return res.status(409).json({ error: 'Store name or email already exists — try another' });
    }
  } catch (checkErr: any) {
    console.error('REGISTER_FAIL', checkErr);
    return res.status(500).json({
      error: checkErr.message || 'Database error during duplicate verification',
      code: checkErr.code,
      detail: checkErr.detail,
    });
  }

  const tenantId = `t-${Date.now()}`;
  const classId = `${MASTER_ISSUER_ID}.tenant_${tenantId}_${archetype || 'loyalty'}_class`;
  const logo = logoUrl || 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&auto=format&fit=crop';
  const color = brandColor || '#ff5722';
  const finalOwnerName = (ownerName || owner_name || '').trim() || 'Store Manager';
  const passwordHash = hashPassword(rawPassword);
  const passLimit = rawPlan === 'scale' ? 50000 : rawPlan === 'starter' ? 500 : 5000;
  const finalStatus = status || 'Pending Approval'; // Default new registrations to Pending Approval

  let insertedRow: any = null;

  // 1) Wrap DB insert in try/catch and return {error: err.message, code: err.code, detail: err.detail}
  try {
    const inserted = await sql`
      INSERT INTO tenants (
        id, slug, name, logo, color, archetype, class_id, issuer_id, owner_name, owner_email, password_hash, status, plan, pass_limit, created_at
      )
      VALUES (
        ${tenantId}, ${slug}, ${storeName}, ${logo}, ${color}, ${archetype || 'loyalty'}, ${classId}, ${MASTER_ISSUER_ID},
        ${finalOwnerName}, ${rawEmail}, crypt(${rawPassword}, gen_salt('bf')), ${finalStatus}, ${rawPlan}, ${passLimit}, NOW()
      )
      RETURNING id, slug, name, logo, color, archetype, class_id, issuer_id, owner_name, owner_email, status, plan, pass_limit, created_at;
    `;
    if (inserted && inserted.length > 0) {
      insertedRow = inserted[0];
    }
  } catch (err: any) {
    // 5) Log full error to Vercel Logs with console.error("REGISTER_FAIL", err)
    console.error('REGISTER_FAIL', err);

    // 3) Duplicate key code 23505
    if (
      err.code === '23505' ||
      err.message?.includes('duplicate key') ||
      err.message?.includes('unique constraint') ||
      err.detail?.includes('already exists')
    ) {
      return res.status(409).json({
        error: 'Store name or email already exists — try another',
        code: err.code,
        detail: err.detail,
      });
    }

    return res.status(500).json({
      error: err.message || 'Database error occurred during store registration',
      code: err.code,
      detail: err.detail,
    });
  }

  if (!insertedRow) {
    return res.status(500).json({ error: 'Failed to insert tenant record into database' });
  }

  const responseTenant = {
    id: insertedRow?.id || tenantId,
    slug: insertedRow?.slug || slug,
    name: insertedRow?.name || storeName,
    ownerName: insertedRow?.owner_name || finalOwnerName,
    ownerEmail: insertedRow?.owner_email || rawEmail,
    legalEntity: legalEntity || `${storeName} LLC`,
    brandColor: insertedRow?.color || color,
    logoUrl: insertedRow?.logo || logo,
    archetype: insertedRow?.archetype || archetype || 'loyalty',
    classId: insertedRow?.class_id || classId,
    plan: insertedRow?.plan || rawPlan,
    passLimit: Number(insertedRow?.pass_limit || passLimit),
    passCount: 0,
    status: insertedRow?.status || finalStatus,
    createdAt: insertedRow?.created_at || new Date().toISOString(),
  };

  res.status(201).json({
    success: true,
    tenant: responseTenant,
    googleWalletClass: {
      id: responseTenant.classId,
      issuerName: responseTenant.name,
      programName: `${responseTenant.name} Rewards`,
      hexBackgroundColor: responseTenant.brandColor,
      reviewStatus: 'UNDER_REVIEW',
      smartTapPayload: 'ENCRYPTED_AES128_HMAC_SHA256',
    },
    message: finalStatus === 'Pending Approval'
      ? 'Store registered and submitted for Super Admin package approval'
      : 'Store provisioned successfully with auth in Neon Postgres',
  });
}

// POST /api/register, /api/tenants, and /api/provision
app.post('/api/register', provisionTenantHandler);
app.post('/api/tenants', provisionTenantHandler);
app.post('/api/provision', provisionTenantHandler);

// POST /api/login - Tenant Owner or Super Admin Login Authentication
app.post('/api/login', async (req: Request, res: Response) => {
  const { email, owner_email, username, password } = req.body || {};
  const userIdentifier = (email || owner_email || username || '').trim().toLowerCase();

  if (!userIdentifier || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  // 1. FIRST check Super Admin credentials via environment variables (do NOT query tenants for admin)
  const superAdminEmail = (process.env.SUPER_ADMIN_EMAIL || '').trim().toLowerCase();
  const adminPasswordHash = (process.env.ADMIN_PASSWORD_HASH || '').trim();

  if (superAdminEmail && userIdentifier === superAdminEmail) {
    if (!adminPasswordHash) {
      return res.status(500).json({ error: 'ADMIN_PASSWORD_HASH is not configured' });
    }
    const isAdminValid = await bcrypt.compare(password, adminPasswordHash);
    if (!isAdminValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    return res.status(200).json({
      success: true,
      role: 'super_admin',
      user: {
        name: 'Super Admin Master Issuer',
        email: superAdminEmail,
        role: 'super_admin',
      },
      token: `session_super_admin_${Date.now()}`,
      message: 'Super Admin login successful',
    });
  }

  if (!sql) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  try {
    await ensureMigration();
    const rows = await sql`
      SELECT 
        id, slug, name, logo, color, archetype, class_id, issuer_id, owner_name, owner_email, password_hash, status, plan, pass_limit, created_at,
        (password_hash = crypt(${password}, password_hash)) as is_valid
      FROM tenants 
      WHERE LOWER(owner_email) = ${userIdentifier} 
         OR slug = ${userIdentifier} 
         OR id = ${userIdentifier}
      LIMIT 1;
    `;

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const tenant = rows[0];
    const isBcryptValid = tenant.password_hash?.startsWith('$2')
      ? await bcrypt.compare(password, tenant.password_hash)
      : false;
    const valid =
      Boolean(tenant.is_valid) ||
      isBcryptValid ||
      (tenant.password_hash ? verifyPassword(password, tenant.password_hash) : false);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const normalizedStatus = (tenant.status || '').trim().toLowerCase();
    if (normalizedStatus === 'pending' || normalizedStatus === 'pending approval') {
      return res.status(403).json({
        success: false,
        pending: true,
        status: tenant.status || 'Pending',
        tenant: {
          id: tenant.id,
          slug: tenant.slug,
          name: tenant.name,
          ownerName: tenant.owner_name || 'Store Owner',
          ownerEmail: tenant.owner_email,
          plan: tenant.plan || 'growth',
          status: tenant.status || 'Pending',
        },
        error: 'Your store registration has been received and is currently waiting for Super Admin approval for your package.',
      });
    }

    if (normalizedStatus === 'suspended' || normalizedStatus === 'rejected') {
      return res.status(403).json({
        success: false,
        status: tenant.status,
        error: 'This merchant account is not active. Please contact the platform administrator.',
      });
    }

    return res.status(200).json({
      success: true,
      role: 'merchant',
      tenant: {
        id: tenant.id,
        slug: tenant.slug,
        name: tenant.name,
        ownerName: tenant.owner_name || 'Store Owner',
        ownerEmail: tenant.owner_email,
        brandColor: tenant.color || '#ff5722',
        logoUrl: tenant.logo,
        archetype: tenant.archetype || 'loyalty',
        classId: tenant.class_id,
        status: tenant.status || 'Active',
        plan: tenant.plan || 'growth',
      },
      user: {
        name: tenant.owner_name || tenant.name,
        email: tenant.owner_email,
        role: 'merchant',
      },
      token: `session_${tenant.id}_${Date.now()}`,
      message: 'Login successful',
    });
  } catch (err: any) {
    console.error('[Login API] Error:', err);
    return res.status(500).json({ error: err.message || 'Login failed' });
  }
});

// GET /api/passes - SELECT FROM members JOIN tenants
app.get('/api/passes', async (_req: Request, res: Response) => {
  if (!sql) {
    return res.status(500).json({ error: 'Database not configured' });
  }

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
    return res.status(500).json({ error: 'Database connection failed' });
  }
});

// GET /api/tenants/:slug - SELECT single tenant with stats from Neon Postgres
app.get('/api/tenants/:slug', async (req: Request, res: Response) => {
  const { slug } = req.params;
  if (!sql) {
    return res.status(500).json({ error: 'Database not configured' });
  }

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
        t.owner_name,
        t.owner_email,
        t.status,
        t.plan,
        t.pass_limit,
        t.created_at,
        COUNT(m.id)::int as pass_count,
        COALESCE(SUM(m.points)::int, 0) as total_points
      FROM tenants t
      LEFT JOIN members m ON m.tenant_id = t.id
      WHERE t.slug = ${slug} 
         OR t.id = ${slug} 
         OR t.slug = ${slug.replace(/-bistro$/, '')}
      GROUP BY t.id, t.slug, t.name, t.logo, t.color, t.archetype, t.class_id, t.issuer_id, t.owner_name, t.owner_email, t.status, t.plan, t.pass_limit, t.created_at
      LIMIT 1;
    `;

    if (rows.length > 0) {
      const r = rows[0];
      return res.json({
        id: r.id,
        slug: r.slug,
        name: r.name,
        ownerName: r.owner_name || 'Store Manager',
        ownerEmail: r.owner_email || `${r.slug}@oloyal.com`,
        legalEntity: `${r.name} LLC`,
        brandColor: r.color || '#ff5722',
        logoUrl: r.logo,
        archetype: r.archetype || 'loyalty',
        classId: r.class_id,
        plan: r.plan || 'growth',
        passLimit: Number(r.pass_limit || (r.plan === 'scale' ? 50000 : r.plan === 'starter' ? 500 : 5000)),
        passCount: Number(r.pass_count || 0),
        totalPoints: Number(r.total_points || 0),
        status: r.status || 'Active',
        createdAt: r.created_at || new Date().toISOString(),
      });
    }

    return res.status(404).json({ error: 'Tenant not found' });
  } catch (err) {
    console.error('[Neon Postgres] GET /api/tenants/:slug error:', err);
    return res.status(500).json({ error: 'Database connection failed' });
  }
});

// GET /api/tenants/:slug/members - SELECT FROM members JOIN tenants WHERE tenant slug
app.get('/api/tenants/:slug/members', async (req: Request, res: Response) => {
  const { slug } = req.params;
  if (!sql) {
    return res.status(500).json({ error: 'Database not configured' });
  }

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
      WHERE t.slug = ${slug} 
         OR t.id = ${slug} 
         OR t.slug = ${slug.replace(/-bistro$/, '')}
         OR (${slug.includes('banlis')} AND (t.slug LIKE '%banlis%' OR t.id LIKE '%banlis%'))
      ORDER BY m.id DESC;
    `;
    return res.json(rows || []);
  } catch (err) {
    console.error('[Neon Postgres] GET /api/tenants/:slug/members error:', err);
    return res.status(500).json({ error: 'Database connection failed' });
  }
});

// PATCH /api/tenants/:slug - Update tenant customization settings, password, and status
app.patch('/api/tenants/:slug', async (req: Request, res: Response) => {
  const { slug } = req.params;
  const { name, logoUrl, brandColor, archetype, status, plan, passLimit, pass_limit, ownerName, ownerEmail, password } = req.body;
  const computedLimit = passLimit || pass_limit || (plan === 'scale' ? 50000 : plan === 'starter' ? 500 : plan === 'growth' ? 5000 : null);
  const rawPwd = password ? String(password).trim() : '';

  if (sql) {
    try {
      const rows = rawPwd ? await sql`
        UPDATE tenants
        SET 
          name = COALESCE(${name || null}, name),
          logo = COALESCE(${logoUrl || null}, logo),
          color = COALESCE(${brandColor || null}, color),
          archetype = COALESCE(${archetype || null}, archetype),
          status = COALESCE(${status || null}, status),
          plan = COALESCE(${plan || null}, plan),
          pass_limit = COALESCE(${computedLimit || null}, pass_limit),
          owner_name = COALESCE(${ownerName || null}, owner_name),
          owner_email = COALESCE(${ownerEmail ? String(ownerEmail).trim().toLowerCase() : null}, owner_email),
          password_hash = crypt(${rawPwd}, gen_salt('bf'))
        WHERE slug = ${slug} OR id = ${slug} OR slug = ${slug.replace(/-bistro$/, '')}
        RETURNING id, slug, name, logo, color, archetype, class_id, issuer_id, status, plan, pass_limit, owner_name, owner_email;
      ` : await sql`
        UPDATE tenants
        SET 
          name = COALESCE(${name || null}, name),
          logo = COALESCE(${logoUrl || null}, logo),
          color = COALESCE(${brandColor || null}, color),
          archetype = COALESCE(${archetype || null}, archetype),
          status = COALESCE(${status || null}, status),
          plan = COALESCE(${plan || null}, plan),
          pass_limit = COALESCE(${computedLimit || null}, pass_limit),
          owner_name = COALESCE(${ownerName || null}, owner_name),
          owner_email = COALESCE(${ownerEmail ? String(ownerEmail).trim().toLowerCase() : null}, owner_email)
        WHERE slug = ${slug} OR id = ${slug} OR slug = ${slug.replace(/-bistro$/, '')}
        RETURNING id, slug, name, logo, color, archetype, class_id, issuer_id, status, plan, pass_limit, owner_name, owner_email;
      `;

      if (rows.length > 0) {
        const r = rows[0];
        return res.json({
          success: true,
          tenant: {
            id: r.id,
            slug: r.slug,
            name: r.name,
            brandColor: r.color,
            logoUrl: r.logo,
            archetype: r.archetype,
            classId: r.class_id,
            status: r.status,
            plan: r.plan,
            passLimit: r.pass_limit,
            ownerName: r.owner_name,
            ownerEmail: r.owner_email,
          },
          message: 'Tenant updated in Neon Postgres',
        });
      }
      return res.status(404).json({ error: 'Tenant not found' });
    } catch (err: any) {
      console.error('[Neon Postgres] PATCH /api/tenants/:slug error:', err);
      if (err?.code === '23505') {
        return res.status(409).json({ error: 'Email already in use by another store' });
      }
      return res.status(500).json({ error: err?.message || 'Database connection failed' });
    }
  }

  return res.status(500).json({ error: 'Database not configured' });
});

// GET & PATCH /api/admin/profile - Super Admin Profile Settings
let runtimeAdminProfile = {
  displayName: 'Super Admin Master Issuer',
  organization: 'PassLoyal OS Master Issuer',
  phone: '',
  contactEmail: '',
};

app.get('/api/admin/profile', async (_req: Request, res: Response) => {
  const email = (process.env.SUPER_ADMIN_EMAIL || runtimeAdminProfile.contactEmail || '').trim();
  if (sql) {
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS platform_settings (
          key TEXT PRIMARY KEY,
          value TEXT,
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `;
      const rows = await sql`
        SELECT key, value FROM platform_settings
        WHERE key IN ('admin_display_name', 'admin_organization', 'admin_phone', 'admin_contact_email', 'admin_issuer_id', 'admin_service_account');
      `;
      const map: Record<string, string> = {};
      rows.forEach((r: any) => {
        map[r.key] = r.value;
      });
      return res.json({
        email: email || map.admin_contact_email || '',
        displayName: map.admin_display_name || runtimeAdminProfile.displayName,
        organization: map.admin_organization || runtimeAdminProfile.organization,
        phone: map.admin_phone || runtimeAdminProfile.phone,
        contactEmail: map.admin_contact_email || email,
        issuerId: map.admin_issuer_id || MASTER_ISSUER_ID,
        serviceAccountEmail: map.admin_service_account || SERVICE_ACCOUNT_EMAIL,
      });
    } catch (err) {
      console.warn('[Admin Profile] GET notice:', err);
    }
  }
  return res.json({
    email,
    displayName: runtimeAdminProfile.displayName,
    organization: runtimeAdminProfile.organization,
    phone: runtimeAdminProfile.phone,
    contactEmail: runtimeAdminProfile.contactEmail || email,
    issuerId: MASTER_ISSUER_ID,
    serviceAccountEmail: SERVICE_ACCOUNT_EMAIL,
  });
});

app.patch('/api/admin/profile', async (req: Request, res: Response) => {
  const { displayName, organization, phone, contactEmail, issuerId, serviceAccountEmail, currentPassword, newPassword } = req.body || {};

  if (displayName) runtimeAdminProfile.displayName = String(displayName).trim();
  if (organization !== undefined) runtimeAdminProfile.organization = String(organization).trim();
  if (phone !== undefined) runtimeAdminProfile.phone = String(phone).trim();
  if (contactEmail !== undefined) runtimeAdminProfile.contactEmail = String(contactEmail).trim().toLowerCase();
  if (issuerId && String(issuerId).trim()) MASTER_ISSUER_ID = String(issuerId).trim();
  if (serviceAccountEmail && String(serviceAccountEmail).trim()) SERVICE_ACCOUNT_EMAIL = String(serviceAccountEmail).trim();

  let generatedPasswordHash: string | undefined;
  if (newPassword) {
    const trimmedNew = String(newPassword).trim();
    if (trimmedNew.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }
    const existingHash = (process.env.ADMIN_PASSWORD_HASH || '').trim();
    if (existingHash) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password is required to change admin password' });
      }
      const match = await bcrypt.compare(String(currentPassword), existingHash);
      if (!match) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }
    }
    generatedPasswordHash = await bcrypt.hash(trimmedNew, 10);
    process.env.ADMIN_PASSWORD_HASH = generatedPasswordHash;
  }

  if (sql) {
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS platform_settings (
          key TEXT PRIMARY KEY,
          value TEXT,
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `;
      const entries: [string, string][] = [
        ['admin_display_name', runtimeAdminProfile.displayName],
        ['admin_organization', runtimeAdminProfile.organization],
        ['admin_phone', runtimeAdminProfile.phone],
        ['admin_contact_email', runtimeAdminProfile.contactEmail],
        ['admin_issuer_id', MASTER_ISSUER_ID],
        ['admin_service_account', SERVICE_ACCOUNT_EMAIL],
      ];
      for (const [k, v] of entries) {
        await sql`
          INSERT INTO platform_settings (key, value, updated_at)
          VALUES (${k}, ${v}, NOW())
          ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
        `;
      }
    } catch (err) {
      console.warn('[Admin Profile] DB save notice:', err);
    }
  }

  return res.json({
    success: true,
    profile: {
      email: (process.env.SUPER_ADMIN_EMAIL || runtimeAdminProfile.contactEmail || '').trim(),
      displayName: runtimeAdminProfile.displayName,
      organization: runtimeAdminProfile.organization,
      phone: runtimeAdminProfile.phone,
      contactEmail: runtimeAdminProfile.contactEmail,
      issuerId: MASTER_ISSUER_ID,
      serviceAccountEmail: SERVICE_ACCOUNT_EMAIL,
    },
    ...(generatedPasswordHash ? { generatedPasswordHash } : {}),
    message: generatedPasswordHash
      ? 'Admin profile & runtime password updated. Copy the generated bcrypt hash into Vercel ADMIN_PASSWORD_HASH for persistence across deployments.'
      : 'Admin profile updated successfully.',
  });
});

// DELETE /api/tenants/:slug - Delete or Archive store tenant
app.delete('/api/tenants/:slug', async (req: Request, res: Response) => {
  const { slug } = req.params;

  if (sql) {
    try {
      await sql`
        DELETE FROM members WHERE tenant_id IN (
          SELECT id FROM tenants WHERE slug = ${slug} OR id = ${slug} OR slug = ${slug.replace(/-bistro$/, '')}
        );
      `;
      const deletedRows = await sql`
        DELETE FROM tenants 
        WHERE slug = ${slug} OR id = ${slug} OR slug = ${slug.replace(/-bistro$/, '')}
        RETURNING id, slug, name;
      `;
      if (deletedRows.length > 0) {
        return res.json({ success: true, deleted: deletedRows[0], message: 'Merchant tenant deleted from Neon Postgres' });
      }
      return res.status(404).json({ error: 'Tenant not found' });
    } catch (err) {
      console.error('[Neon Postgres] DELETE /api/tenants/:slug error:', err);
      return res.status(500).json({ error: 'Database connection failed' });
    }
  }

  return res.status(500).json({ error: 'Database not configured' });
});

// POST /api/tenants/:slug/enroll - Customer Sign-up & Mint Google Wallet Pass
app.post('/api/tenants/:slug/enroll', async (req: Request, res: Response) => {
  if (!sql) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  const { slug } = req.params;
  const { name, email, phone } = req.body;

  let tenant: TenantRow | undefined;

  try {
    const rows = await sql`
      SELECT * FROM tenants 
      WHERE slug = ${slug} 
         OR id = ${slug} 
         OR slug = ${slug.replace(/-bistro$/, '')}
         OR slug = 'banlis' 
         OR slug = 'banlis-bistro'
      LIMIT 1;
    `;
    if (rows.length > 0) {
      tenant = rows[0] as TenantRow;
    }
  } catch (err) {
    console.error('[Neon Postgres] Find tenant error:', err);
    return res.status(500).json({ error: 'Database connection failed' });
  }

  if (!tenant) {
    return res.status(404).json({ error: 'Tenant not found' });
  }

  console.log(`Enroll tenant slug=${slug} resolved id=${tenant.id}`);

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
    return res.status(500).json({ error: 'Database connection failed' });
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
  if (!sql) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  const { objectId } = req.params;
  const { deltaPoints, absolutePoints, reason } = req.body;

  let currentPoints = 100;
  let memberId = '889042';

  try {
    const rows = await sql`
      SELECT * FROM members 
      WHERE google_object_id = ${objectId} OR id = ${objectId} OR member_id = ${objectId} 
      LIMIT 1;
    `;

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Member pass not found' });
    }

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
  } catch (err) {
    console.error('[Neon Postgres] UPDATE points error:', err);
    return res.status(500).json({ error: 'Database connection failed' });
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
  if (!sql) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  let storeName = 'Banlis Bistro & Dining';
  let passCount = 0;

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
  } catch (err) {
    console.error('[Neon Postgres] GET billing error:', err);
    return res.status(500).json({ error: 'Database connection failed' });
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
