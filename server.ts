import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';

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

// Stable HMAC secret for signing/verifying auth tokens
const AUTH_SECRET =
  process.env.AUTH_SECRET ||
  process.env.SESSION_SECRET ||
  process.env.JWT_SECRET ||
  crypto
    .createHash('sha256')
    .update(`passloyal-os-auth:${DATABASE_URL || 'local'}:${process.env.ADMIN_PASSWORD_HASH || ''}`)
    .digest('hex');

interface AuthContext {
  role: 'super_admin' | 'admin' | 'merchant';
  tenantId?: string;
  tenantSlug?: string;
  email?: string;
  iat: number;
  exp: number;
}

function signAuthToken(payload: Omit<AuthContext, 'iat' | 'exp'>): string {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: AuthContext = {
    ...payload,
    iat: now,
    exp: now + 60 * 60 * 24 * 7,
  };
  const body = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const sig = crypto.createHmac('sha256', AUTH_SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}

function verifyAuthToken(req: Request): AuthContext | null {
  const authHeader = String(req.headers.authorization || req.headers['x-auth-token'] || '').trim();
  const token = authHeader.toLowerCase().startsWith('bearer ')
    ? authHeader.slice(7).trim()
    : authHeader;

  if (!token || !token.includes('.')) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [body, sig] = parts;

  try {
    const expectedSig = crypto.createHmac('sha256', AUTH_SECRET).update(body).digest('base64url');
    const sigBuf = Buffer.from(sig);
    const expBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }
    const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as AuthContext;
    if (!parsed || !parsed.role || (parsed.exp && parsed.exp < Math.floor(Date.now() / 1000))) {
      return null;
    }
    if (parsed.role === 'merchant' && !parsed.tenantId) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function isAdminRole(role?: string): boolean {
  return role === 'super_admin' || role === 'admin';
}

function hashPassword(password: string): string {
  if (!password) return '';
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, storedHash?: string | null): boolean {
  if (!storedHash) return false;
  try {
    if (!storedHash.includes(':')) {
      const sha = crypto.createHash('sha256').update(password).digest('hex');
      return sha === storedHash || password === storedHash;
    }
    const [salt, hash] = storedHash.split(':');
    const checkHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    const hashBuf = Buffer.from(hash, 'hex');
    const checkBuf = Buffer.from(checkHash, 'hex');
    if (hashBuf.length !== checkBuf.length) return false;
    return crypto.timingSafeEqual(hashBuf, checkBuf);
  } catch {
    return false;
  }
}

let migrationPromise: Promise<void> | null = null;

async function ensureMigration(): Promise<void> {
  if (!sql) return;
  if (!migrationPromise) {
    migrationPromise = (async () => {
      try {
        try {
          await sql`CREATE EXTENSION IF NOT EXISTS pgcrypto;`;
        } catch (extErr: any) {
          console.warn('[Migration] pgcrypto extension notice:', extErr?.message || extErr);
        }
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
        try {
          await sql`
            UPDATE tenants 
            SET status = 'Active',
                password_hash = COALESCE(password_hash, crypt('admin123', gen_salt('bf')))
            WHERE (slug = 'banlis' OR slug = 'banlis-bistro' OR owner_email = 'banlis@oloyal.com')
              AND (password_hash IS NULL OR password_hash = '');
          `;
        } catch {}
      } catch (err: any) {
        console.warn('[Migration] Note on combined statement:', err?.message || err);
      }
    })();
  }
  await migrationPromise;
}

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

// GET /api/auth/me - Validate active signed session token
app.get('/api/auth/me', (req: Request, res: Response) => {
  const auth = verifyAuthToken(req);
  if (!auth) {
    return res.status(401).json({ error: 'Invalid or expired session token' });
  }
  return res.status(200).json({ authenticated: true, user: auth });
});

// GET /api/stats - DB Aggregate Counts (strictly tenant-scoped for merchants)
app.get('/api/stats', async (req: Request, res: Response) => {
  const auth = verifyAuthToken(req);
  if (!auth) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  await ensureMigration();
  if (!sql) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  try {
    if (isAdminRole(auth.role)) {
      const tenantRows = await sql`SELECT COUNT(*)::int as count FROM tenants;`;
      const memberRows = await sql`SELECT COUNT(*)::int as count FROM members;`;
      const activeTenants = tenantRows[0]?.count || 0;
      const totalPasses = memberRows[0]?.count || 0;

      return res.json({
        activeTenants,
        totalPasses,
        todayRevenue: totalPasses * 35.5,
        redemptionRate: totalPasses > 0 ? '28.4%' : '0%',
        avgCheck: 48.2,
        pointsLiability: totalPasses * 100,
      });
    }

    const memberRows = await sql`
      SELECT COUNT(*)::int as count, COALESCE(SUM(points)::int, 0) as total_points
      FROM members WHERE tenant_id = ${auth.tenantId};
    `;
    const totalPasses = Number(memberRows[0]?.count || 0);
    const totalPoints = Number(memberRows[0]?.total_points || 0);

    return res.json({
      activeTenants: 1,
      totalPasses,
      todayRevenue: totalPasses * 35.5,
      redemptionRate: totalPasses > 0 ? '28.4%' : '0%',
      avgCheck: 48.2,
      pointsLiability: totalPoints,
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

// GET /api/credentials (Super Admin only)
app.get('/api/credentials', (req: Request, res: Response) => {
  const auth = verifyAuthToken(req);
  if (!auth || !isAdminRole(auth.role)) {
    return res.status(auth ? 403 : 401).json({ error: 'Super Admin authentication required' });
  }
  res.json({
    issuerId: MASTER_ISSUER_ID,
    serviceAccountEmail: SERVICE_ACCOUNT_EMAIL,
    hasPrivateKey: !!PRIVATE_KEY_PEM,
  });
});

// POST /api/credentials - Update Master Credentials (Super Admin only)
app.post('/api/credentials', (req: Request, res: Response) => {
  const auth = verifyAuthToken(req);
  if (!auth || !isAdminRole(auth.role)) {
    return res.status(auth ? 403 : 401).json({ error: 'Super Admin authentication required' });
  }
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

// GET /api/tenants - Merchants strictly see only their own tenant; Super Admin sees all / filtered
app.get('/api/tenants', async (req: Request, res: Response) => {
  const auth = verifyAuthToken(req);
  if (!auth) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  await ensureMigration();
  if (!sql) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  const statusParam = typeof req.query?.status === 'string' ? req.query.status.trim().toLowerCase() : '';

  try {
    let rows: any[];
    if (!isAdminRole(auth.role)) {
      rows = await sql`
        SELECT 
          t.id, t.slug, t.name, t.logo, t.color, t.archetype, t.class_id, t.issuer_id,
          t.owner_name, t.owner_email, t.status, t.plan, t.pass_limit, t.created_at,
          COUNT(m.id)::int as pass_count
        FROM tenants t
        LEFT JOIN members m ON m.tenant_id = t.id
        WHERE t.id = ${auth.tenantId}
        GROUP BY t.id, t.slug, t.name, t.logo, t.color, t.archetype, t.class_id, t.issuer_id, t.owner_name, t.owner_email, t.status, t.plan, t.pass_limit, t.created_at;
      `;
    } else if (statusParam === 'pending' || statusParam === 'pending approval') {
      rows = await sql`
        SELECT 
          t.id, t.slug, t.name, t.logo, t.color, t.archetype, t.class_id, t.issuer_id,
          t.owner_name, t.owner_email, t.status, t.plan, t.pass_limit, t.created_at,
          COUNT(m.id)::int as pass_count
        FROM tenants t
        LEFT JOIN members m ON m.tenant_id = t.id
        WHERE LOWER(COALESCE(t.status, '')) IN ('pending', 'pending approval')
        GROUP BY t.id, t.slug, t.name, t.logo, t.color, t.archetype, t.class_id, t.issuer_id, t.owner_name, t.owner_email, t.status, t.plan, t.pass_limit, t.created_at
        ORDER BY t.created_at DESC NULLS LAST, t.id DESC;
      `;
    } else if (statusParam) {
      rows = await sql`
        SELECT 
          t.id, t.slug, t.name, t.logo, t.color, t.archetype, t.class_id, t.issuer_id,
          t.owner_name, t.owner_email, t.status, t.plan, t.pass_limit, t.created_at,
          COUNT(m.id)::int as pass_count
        FROM tenants t
        LEFT JOIN members m ON m.tenant_id = t.id
        WHERE LOWER(COALESCE(t.status, '')) = ${statusParam}
        GROUP BY t.id, t.slug, t.name, t.logo, t.color, t.archetype, t.class_id, t.issuer_id, t.owner_name, t.owner_email, t.status, t.plan, t.pass_limit, t.created_at
        ORDER BY t.id;
      `;
    } else {
      rows = await sql`
        SELECT 
          t.id, t.slug, t.name, t.logo, t.color, t.archetype, t.class_id, t.issuer_id,
          t.owner_name, t.owner_email, t.status, t.plan, t.pass_limit, t.created_at,
          COUNT(m.id)::int as pass_count
        FROM tenants t
        LEFT JOIN members m ON m.tenant_id = t.id
        GROUP BY t.id, t.slug, t.name, t.logo, t.color, t.archetype, t.class_id, t.issuer_id, t.owner_name, t.owner_email, t.status, t.plan, t.pass_limit, t.created_at
        ORDER BY t.id;
      `;
    }

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

  const auth = verifyAuthToken(req);
  const finalStatus = isAdminRole(auth?.role) && status ? status : 'Pending Approval';

  const tenantId = `t-${Date.now()}`;
  const classId = `${MASTER_ISSUER_ID}.tenant_${tenantId}_${archetype || 'loyalty'}_class`;
  const logo = logoUrl || 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&auto=format&fit=crop';
  const color = brandColor || '#ff5722';
  const finalOwnerName = (ownerName || owner_name || '').trim() || 'Store Manager';
  hashPassword(rawPassword);
  const passLimit = rawPlan === 'scale' ? 50000 : rawPlan === 'starter' ? 500 : 5000;

  let insertedRow: any = null;

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
    console.error('REGISTER_FAIL', err);

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

  // 1. FIRST check Super Admin credentials via environment variables
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
    const token = signAuthToken({
      role: 'super_admin',
      email: superAdminEmail,
    });
    return res.status(200).json({
      success: true,
      role: 'super_admin',
      user: {
        name: 'Super Admin Master Issuer',
        email: superAdminEmail,
        role: 'super_admin',
      },
      token,
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

    const token = signAuthToken({
      role: 'merchant',
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      email: tenant.owner_email,
    });

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
      token,
      message: 'Login successful',
    });
  } catch (err: any) {
    console.error('[Login API] Error:', err);
    return res.status(500).json({ error: err.message || 'Login failed' });
  }
});

// Helper: Resolve strictly scoped member list query
async function fetchScopedMembers(auth: AuthContext, requestedSlug?: string) {
  if (!sql) return null;

  if (!isAdminRole(auth.role)) {
    return sql`
      SELECT 
        m.id, m.tenant_id, m.name as customer_name, m.phone, m.email,
        m.member_id, m.points, m.balance_cents, m.google_object_id,
        t.name as store_name, t.slug as store_slug, t.color as brand_color, t.logo as logo_url, t.class_id
      FROM members m
      JOIN tenants t ON m.tenant_id = t.id
      WHERE m.tenant_id = ${auth.tenantId}
      ORDER BY m.id DESC;
    `;
  }

  if (requestedSlug) {
    return sql`
      SELECT 
        m.id, m.tenant_id, m.name as customer_name, m.phone, m.email,
        m.member_id, m.points, m.balance_cents, m.google_object_id,
        t.name as store_name, t.slug as store_slug, t.color as brand_color, t.logo as logo_url, t.class_id
      FROM members m
      JOIN tenants t ON m.tenant_id = t.id
      WHERE t.slug = ${requestedSlug} OR t.id = ${requestedSlug}
      ORDER BY m.id DESC;
    `;
  }

  return sql`
    SELECT 
      m.id, m.tenant_id, m.name as customer_name, m.phone, m.email,
      m.member_id, m.points, m.balance_cents, m.google_object_id,
      t.name as store_name, t.slug as store_slug, t.color as brand_color, t.logo as logo_url, t.class_id
    FROM members m
    JOIN tenants t ON m.tenant_id = t.id
    ORDER BY m.id DESC;
  `;
}

// GET /api/members - Strictly filters WHERE tenant_id = auth.tenantId (query param ignored for merchants)
app.get('/api/members', async (req: Request, res: Response) => {
  const auth = verifyAuthToken(req);
  if (!auth) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  await ensureMigration();
  if (!sql) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  const adminSlug = isAdminRole(auth.role) && typeof req.query?.slug === 'string' ? req.query.slug.trim() : undefined;

  try {
    const rows = await fetchScopedMembers(auth, adminSlug);
    return res.json(rows || []);
  } catch (err) {
    console.error('[Neon Postgres] GET /api/members error:', err);
    return res.status(500).json({ error: 'Database connection failed' });
  }
});

// GET /api/members/:id - Strictly enforces tenant_id = auth tenant
app.get('/api/members/:id', async (req: Request, res: Response) => {
  const auth = verifyAuthToken(req);
  if (!auth) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  await ensureMigration();
  if (!sql) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  const rawId = req.params.id;
  try {
    const rows = !isAdminRole(auth.role)
      ? await sql`
          SELECT 
            m.id, m.tenant_id, m.name as customer_name, m.phone, m.email,
            m.member_id, m.points, m.balance_cents, m.google_object_id,
            t.name as store_name, t.slug as store_slug, t.color as brand_color, t.logo as logo_url, t.class_id
          FROM members m
          JOIN tenants t ON m.tenant_id = t.id
          WHERE (m.id = ${rawId} OR m.member_id = ${rawId} OR m.google_object_id = ${rawId})
            AND m.tenant_id = ${auth.tenantId}
          LIMIT 1;
        `
      : await sql`
          SELECT 
            m.id, m.tenant_id, m.name as customer_name, m.phone, m.email,
            m.member_id, m.points, m.balance_cents, m.google_object_id,
            t.name as store_name, t.slug as store_slug, t.color as brand_color, t.logo as logo_url, t.class_id
          FROM members m
          JOIN tenants t ON m.tenant_id = t.id
          WHERE (m.id = ${rawId} OR m.member_id = ${rawId} OR m.google_object_id = ${rawId})
          LIMIT 1;
        `;

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }
    return res.json(rows[0]);
  } catch (err) {
    console.error('[Neon Postgres] GET /api/members/:id error:', err);
    return res.status(500).json({ error: 'Database connection failed' });
  }
});

// GET /api/passes - Same strict tenant isolation
app.get('/api/passes', async (req: Request, res: Response) => {
  const auth = verifyAuthToken(req);
  if (!auth) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  await ensureMigration();
  if (!sql) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  const adminSlug = isAdminRole(auth.role) && typeof req.query?.slug === 'string' ? req.query.slug.trim() : undefined;

  try {
    const rows = await fetchScopedMembers(auth, adminSlug);
    return res.json(rows || []);
  } catch (err) {
    console.error('[Neon Postgres] JOIN members AND tenants error:', err);
    return res.status(500).json({ error: 'Database connection failed' });
  }
});

// GET /api/tenants/:slug - Strictly enforces tenant ownership for merchants
app.get('/api/tenants/:slug', async (req: Request, res: Response) => {
  const auth = verifyAuthToken(req);
  if (!auth) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  await ensureMigration();
  const { slug } = req.params;
  if (!sql) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  if (!isAdminRole(auth.role) && slug !== auth.tenantSlug && slug !== auth.tenantId) {
    return res.status(403).json({ error: 'Forbidden: cross-tenant access denied' });
  }

  try {
    const rows = !isAdminRole(auth.role)
      ? await sql`
          SELECT 
            t.id, t.slug, t.name, t.logo, t.color, t.archetype, t.class_id, t.issuer_id,
            t.owner_name, t.owner_email, t.status, t.plan, t.pass_limit, t.created_at,
            COUNT(m.id)::int as pass_count,
            COALESCE(SUM(m.points)::int, 0) as total_points
          FROM tenants t
          LEFT JOIN members m ON m.tenant_id = t.id
          WHERE t.id = ${auth.tenantId}
          GROUP BY t.id, t.slug, t.name, t.logo, t.color, t.archetype, t.class_id, t.issuer_id, t.owner_name, t.owner_email, t.status, t.plan, t.pass_limit, t.created_at
          LIMIT 1;
        `
      : await sql`
          SELECT 
            t.id, t.slug, t.name, t.logo, t.color, t.archetype, t.class_id, t.issuer_id,
            t.owner_name, t.owner_email, t.status, t.plan, t.pass_limit, t.created_at,
            COUNT(m.id)::int as pass_count,
            COALESCE(SUM(m.points)::int, 0) as total_points
          FROM tenants t
          LEFT JOIN members m ON m.tenant_id = t.id
          WHERE t.slug = ${slug} OR t.id = ${slug}
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

// GET /api/tenants/:slug/members - Strictly enforces tenant_id (NO banlis fallback)
app.get('/api/tenants/:slug/members', async (req: Request, res: Response) => {
  const auth = verifyAuthToken(req);
  if (!auth) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  await ensureMigration();
  const { slug } = req.params;
  if (!sql) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  if (!isAdminRole(auth.role) && slug !== auth.tenantSlug && slug !== auth.tenantId) {
    return res.status(403).json({ error: 'Forbidden: cross-tenant access denied' });
  }

  try {
    const rows = await fetchScopedMembers(auth, slug);
    return res.json(rows || []);
  } catch (err) {
    console.error('[Neon Postgres] GET /api/tenants/:slug/members error:', err);
    return res.status(500).json({ error: 'Database connection failed' });
  }
});

// Shared tenant update helper with strict auth check
async function updateTenantScoped(auth: AuthContext, requestedTarget: string, body: any, res: Response) {
  await ensureMigration();
  if (!sql) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  const isSuper = isAdminRole(auth.role);
  if (!isSuper && requestedTarget !== auth.tenantId && requestedTarget !== auth.tenantSlug) {
    return res.status(403).json({ error: 'Forbidden: cannot modify another store tenant' });
  }

  const { name, logoUrl, brandColor, archetype, status, plan, passLimit, pass_limit, ownerName, ownerEmail, password } = body || {};
  const safeStatus = isSuper ? status || null : null;
  const safePlan = isSuper ? plan || null : null;
  const computedLimit = isSuper
    ? passLimit || pass_limit || (plan === 'scale' ? 50000 : plan === 'starter' ? 500 : plan === 'growth' ? 5000 : null)
    : null;
  const rawPwd = password ? String(password).trim() : '';

  if (rawPwd && rawPwd.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  try {
    const rows = isSuper
      ? rawPwd
        ? await sql`
            UPDATE tenants
            SET 
              name = COALESCE(${name || null}, name),
              logo = COALESCE(${logoUrl || null}, logo),
              color = COALESCE(${brandColor || null}, color),
              archetype = COALESCE(${archetype || null}, archetype),
              status = COALESCE(${safeStatus}, status),
              plan = COALESCE(${safePlan}, plan),
              pass_limit = COALESCE(${computedLimit}, pass_limit),
              owner_name = COALESCE(${ownerName || null}, owner_name),
              owner_email = COALESCE(${ownerEmail ? String(ownerEmail).trim().toLowerCase() : null}, owner_email),
              password_hash = crypt(${rawPwd}, gen_salt('bf'))
            WHERE slug = ${requestedTarget} OR id = ${requestedTarget}
            RETURNING id, slug, name, logo, color, archetype, class_id, issuer_id, status, plan, pass_limit, owner_name, owner_email;
          `
        : await sql`
            UPDATE tenants
            SET 
              name = COALESCE(${name || null}, name),
              logo = COALESCE(${logoUrl || null}, logo),
              color = COALESCE(${brandColor || null}, color),
              archetype = COALESCE(${archetype || null}, archetype),
              status = COALESCE(${safeStatus}, status),
              plan = COALESCE(${safePlan}, plan),
              pass_limit = COALESCE(${computedLimit}, pass_limit),
              owner_name = COALESCE(${ownerName || null}, owner_name),
              owner_email = COALESCE(${ownerEmail ? String(ownerEmail).trim().toLowerCase() : null}, owner_email)
            WHERE slug = ${requestedTarget} OR id = ${requestedTarget}
            RETURNING id, slug, name, logo, color, archetype, class_id, issuer_id, status, plan, pass_limit, owner_name, owner_email;
          `
      : rawPwd
      ? await sql`
          UPDATE tenants
          SET 
            name = COALESCE(${name || null}, name),
            logo = COALESCE(${logoUrl || null}, logo),
            color = COALESCE(${brandColor || null}, color),
            archetype = COALESCE(${archetype || null}, archetype),
            owner_name = COALESCE(${ownerName || null}, owner_name),
            owner_email = COALESCE(${ownerEmail ? String(ownerEmail).trim().toLowerCase() : null}, owner_email),
            password_hash = crypt(${rawPwd}, gen_salt('bf'))
          WHERE id = ${auth.tenantId}
          RETURNING id, slug, name, logo, color, archetype, class_id, issuer_id, status, plan, pass_limit, owner_name, owner_email;
        `
      : await sql`
          UPDATE tenants
          SET 
            name = COALESCE(${name || null}, name),
            logo = COALESCE(${logoUrl || null}, logo),
            color = COALESCE(${brandColor || null}, color),
            archetype = COALESCE(${archetype || null}, archetype),
            owner_name = COALESCE(${ownerName || null}, owner_name),
            owner_email = COALESCE(${ownerEmail ? String(ownerEmail).trim().toLowerCase() : null}, owner_email)
          WHERE id = ${auth.tenantId}
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
    console.error('[Neon Postgres] PATCH tenant error:', err);
    if (err?.code === '23505') {
      return res.status(409).json({ error: 'Email already in use by another store' });
    }
    return res.status(500).json({ error: err?.message || 'Database connection failed' });
  }
}

app.patch('/api/tenants', (req: Request, res: Response) => {
  const auth = verifyAuthToken(req);
  if (!auth) return res.status(401).json({ error: 'Authentication required' });
  const target = req.body?.slug || req.body?.id || req.query?.slug || req.query?.id || auth.tenantId;
  if (!target) return res.status(400).json({ error: 'Tenant slug or id is required for update' });
  return updateTenantScoped(auth, String(target), req.body, res);
});

app.put('/api/tenants', (req: Request, res: Response) => {
  const auth = verifyAuthToken(req);
  if (!auth) return res.status(401).json({ error: 'Authentication required' });
  const target = req.body?.slug || req.body?.id || req.query?.slug || req.query?.id || auth.tenantId;
  if (!target) return res.status(400).json({ error: 'Tenant slug or id is required for update' });
  return updateTenantScoped(auth, String(target), req.body, res);
});

app.patch('/api/tenants/:slug', (req: Request, res: Response) => {
  const auth = verifyAuthToken(req);
  if (!auth) return res.status(401).json({ error: 'Authentication required' });
  return updateTenantScoped(auth, req.params.slug, req.body, res);
});

app.put('/api/tenants/:slug', (req: Request, res: Response) => {
  const auth = verifyAuthToken(req);
  if (!auth) return res.status(401).json({ error: 'Authentication required' });
  return updateTenantScoped(auth, req.params.slug, req.body, res);
});

// GET & PATCH /api/admin/profile - Super Admin Profile Settings (Super Admin only)
let runtimeAdminProfile = {
  displayName: 'Super Admin Master Issuer',
  organization: 'PassLoyal OS Master Issuer',
  phone: '',
  contactEmail: '',
};

app.get('/api/admin/profile', async (req: Request, res: Response) => {
  const auth = verifyAuthToken(req);
  if (!auth || !isAdminRole(auth.role)) {
    return res.status(auth ? 403 : 401).json({ error: 'Super Admin authentication required' });
  }
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

async function handleAdminProfileUpdate(req: Request, res: Response) {
  const auth = verifyAuthToken(req);
  if (!auth || !isAdminRole(auth.role)) {
    return res.status(auth ? 403 : 401).json({ error: 'Super Admin authentication required' });
  }
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
}

app.patch('/api/admin/profile', handleAdminProfileUpdate);
app.put('/api/admin/profile', handleAdminProfileUpdate);

// DELETE /api/tenants/:slug - Super Admin only
app.delete('/api/tenants/:slug', async (req: Request, res: Response) => {
  const auth = verifyAuthToken(req);
  if (!auth || !isAdminRole(auth.role)) {
    return res.status(auth ? 403 : 401).json({ error: 'Super Admin privileges required' });
  }
  const { slug } = req.params;

  if (sql) {
    try {
      await sql`
        DELETE FROM members WHERE tenant_id IN (
          SELECT id FROM tenants WHERE slug = ${slug} OR id = ${slug}
        );
      `;
      const deletedRows = await sql`
        DELETE FROM tenants 
        WHERE slug = ${slug} OR id = ${slug}
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

// Shared member enrollment handler
async function enrollMemberForTenant(tenant: TenantRow, req: Request, res: Response) {
  const { name, email, phone } = req.body || {};
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: 'Customer name is required' });
  }
  if (!sql) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  const memberIdCode = `PL-${Math.floor(100000 + Math.random() * 900000)}`;
  const uuid = `mem-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const objectId = `${MASTER_ISSUER_ID}.customer_${memberIdCode.replace(/[^a-zA-Z0-9_.]/g, '')}_obj`;
  const memberName = String(name).trim();
  const memberPhone = phone ? String(phone).trim() : '';
  const memberEmail = email ? String(email).trim() : '';

  let welcomePoints = 100;
  let customProgramName = `${tenant.name} Loyalty`;
  let barcodeMode: 'barcode' | 'qr' = 'barcode';
  try {
    await ensureProgramTables();
    const cfgRows = await sql`
      SELECT program_name, welcome_active, welcome_grant, barcode_mode
      FROM program_configs
      WHERE tenant_id = ${tenant.id}
      LIMIT 1;
    `;
    if (cfgRows.length > 0) {
      if (cfgRows[0].program_name) customProgramName = cfgRows[0].program_name;
      welcomePoints = cfgRows[0].welcome_active ? Number(cfgRows[0].welcome_grant ?? 100) : 0;
      if (cfgRows[0].barcode_mode === 'qr') barcodeMode = 'qr';
    }
  } catch {}

  if (typeof req.body?.initialPoints === 'number' && !isNaN(req.body.initialPoints)) {
    welcomePoints = Math.max(0, Math.round(req.body.initialPoints));
  }

  let insertedMember: any = null;
  try {
    const rows = await sql`
      INSERT INTO members (id, tenant_id, name, phone, email, member_id, points, balance_cents, google_object_id)
      VALUES (${uuid}, ${tenant.id}, ${memberName}, ${memberPhone}, ${memberEmail}, ${memberIdCode}, ${welcomePoints}, 0, ${objectId})
      RETURNING *;
    `;
    if (rows.length > 0) {
      insertedMember = rows[0];
    }

    if (welcomePoints > 0) {
      const txId = `tx-${Date.now()}`;
      try {
        await sql`
          INSERT INTO point_transactions (id, member_id, change_amount, reason)
          VALUES (${txId}, ${uuid}, ${welcomePoints}, 'Welcome Bonus');
        `;
      } catch {
        await sql`
          INSERT INTO point_transactions (id, member_id, tenant_id, change_amount, reason)
          VALUES (${txId}, ${uuid}, ${tenant.id}, ${welcomePoints}, 'Welcome Bonus');
        `;
      }
    }
  } catch (err: any) {
    console.error('[Neon Postgres] INSERT member error:', err);
    return res.status(500).json({ error: `Failed to save member in database: ${err?.message || 'Database error'}` });
  }

  const finalMember = insertedMember || {
    id: uuid,
    tenant_id: tenant.id,
    name: memberName,
    email: memberEmail,
    phone: memberPhone,
    member_id: memberIdCode,
    points: welcomePoints,
    balance_cents: 0,
    google_object_id: objectId,
  };

  const logoUri =
    tenant.logo &&
    tenant.logo.startsWith('http') &&
    !tenant.logo.includes('googleusercontent.com/aida-public/')
      ? tenant.logo
      : 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&auto=format&fit=crop';

  const loyaltyClass = {
    id: tenant.class_id,
    issuerName: tenant.name,
    programName: customProgramName,
    programLogo: {
      sourceUri: { uri: logoUri },
      contentDescription: {
        defaultValue: { language: 'en-US', value: `${tenant.name} Logo` },
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
    accountId: memberIdCode,
    accountName: memberName,
    barcode: {
      type: barcodeMode === 'barcode' ? 'CODE_128' : 'QR_CODE',
      value: memberIdCode,
      alternateText: memberIdCode,
    },
    loyaltyPoints: {
      label: 'Points',
      balance: { int: welcomePoints },
    },
    textModulesData: [
      { id: 'mod_member', header: 'MEMBER', body: memberName },
      { id: 'mod_phone', header: 'PHONE', body: memberPhone || memberIdCode },
      { id: 'mod_points', header: 'POINTS', body: `${welcomePoints} Points - Welcome Bonus` },
    ],
  };

  const requestOrigins: string[] = [];
  if (req.headers.origin) requestOrigins.push(String(req.headers.origin));
  if (req.headers.referer) requestOrigins.push(String(req.headers.referer));

  let saveToWalletUrl: string | null = null;
  try {
    const signedJwtToken = signGoogleWalletJwt(
      { loyaltyClasses: [loyaltyClass], loyaltyObjects: [loyaltyObject] },
      SERVICE_ACCOUNT_EMAIL,
      PRIVATE_KEY_PEM || process.env.GOOGLE_PRIVATE_KEY,
      requestOrigins
    );
    saveToWalletUrl = `https://pay.google.com/gp/v/save/${signedJwtToken}`;
  } catch (jwtErr: any) {
    console.warn('[Enrollment JWT Warning]:', jwtErr?.message || 'Google Wallet key unavailable');
  }

  return res.status(201).json({
    success: true,
    member: finalMember,
    pass: {
      id: finalMember.id,
      objectId,
      tenantId: tenant.id,
      customerName: memberName,
      email: memberEmail,
      phone: memberPhone,
      points: welcomePoints,
      tier: welcomePoints >= 2000 ? 'PLATINUM' : welcomePoints >= 1000 ? 'GOLD VIP' : 'SILVER',
      jwtUrl: saveToWalletUrl,
      syncedAt: new Date().toISOString(),
    },
    saveToWalletUrl,
    walletUrl: saveToWalletUrl,
    qr: memberIdCode,
    qrCodeData: `PASS-LOVAL-NFC:${objectId}`,
    tenant: {
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
      brandColor: tenant.color,
      logoUrl: tenant.logo,
    },
  });
}

// POST /api/members - Enforces tenant_id from auth token
app.post('/api/members', async (req: Request, res: Response) => {
  const auth = verifyAuthToken(req);
  if (!auth) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  await ensureMigration();
  if (!sql) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  const targetRef = isAdminRole(auth.role)
    ? req.body?.tenantId || req.body?.tenant_id || req.body?.tenantSlug || req.body?.slug
    : auth.tenantId;

  if (!targetRef) {
    return res.status(400).json({ error: 'Target tenant is required' });
  }

  try {
    const rows = isAdminRole(auth.role)
      ? await sql`SELECT id, slug, name, logo, color, archetype, class_id, issuer_id FROM tenants WHERE id = ${targetRef} OR slug = ${targetRef} LIMIT 1;`
      : await sql`SELECT id, slug, name, logo, color, archetype, class_id, issuer_id FROM tenants WHERE id = ${auth.tenantId} LIMIT 1;`;

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    return enrollMemberForTenant(rows[0] as TenantRow, req, res);
  } catch (err) {
    console.error('[Neon Postgres] POST /api/members error:', err);
    return res.status(500).json({ error: 'Database connection failed' });
  }
});

// POST /api/tenants/:slug/enroll - Strict tenant lookup (NO banlis fallback, NO LIMIT 1 fallback)
app.post('/api/tenants/:slug/enroll', async (req: Request, res: Response) => {
  await ensureMigration();
  if (!sql) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  const auth = verifyAuthToken(req);
  const { slug } = req.params;

  if (auth && !isAdminRole(auth.role) && slug !== auth.tenantSlug && slug !== auth.tenantId) {
    return res.status(403).json({ error: 'Forbidden: cannot enroll member into another tenant' });
  }

  try {
    const rows =
      auth && !isAdminRole(auth.role)
        ? await sql`SELECT id, slug, name, logo, color, archetype, class_id, issuer_id FROM tenants WHERE id = ${auth.tenantId} LIMIT 1;`
        : await sql`SELECT id, slug, name, logo, color, archetype, class_id, issuer_id FROM tenants WHERE slug = ${slug} OR id = ${slug} LIMIT 1;`;

    if (rows.length === 0) {
      return res.status(404).json({ error: `Tenant not found for slug=${slug}` });
    }
    return enrollMemberForTenant(rows[0] as TenantRow, req, res);
  } catch (err) {
    console.error('[Neon Postgres] POST /api/tenants/:slug/enroll error:', err);
    return res.status(500).json({ error: 'Database connection failed' });
  }
});

// Shared points adjustment logic - STRICTLY enforces tenant_id = auth.tenantId for merchants
async function handleMemberPointsUpdate(req: Request, rawId: string, body: any, res: Response) {
  const auth = verifyAuthToken(req);
  if (!auth) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  await ensureMigration();
  if (!rawId) {
    return res.status(400).json({ error: 'Member ID parameter is required' });
  }
  if (!sql) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  const delta = Number(body?.points ?? body?.deltaPoints ?? 0);
  const absolute = typeof body?.absolutePoints === 'number' ? body.absolutePoints : null;
  const reason = body?.reason || 'Points Adjustment';

  try {
    const rows = !isAdminRole(auth.role)
      ? await sql`
          SELECT * FROM members 
          WHERE (id = ${rawId} OR google_object_id = ${rawId} OR member_id = ${rawId})
            AND tenant_id = ${auth.tenantId}
          LIMIT 1;
        `
      : await sql`
          SELECT * FROM members 
          WHERE id = ${rawId} OR google_object_id = ${rawId} OR member_id = ${rawId}
          LIMIT 1;
        `;

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Member pass not found for active tenant' });
    }

    const currentMember = rows[0];
    const currentPoints = Number(currentMember.points || 0);
    const newPoints = absolute !== null ? Math.max(0, absolute) : Math.max(0, currentPoints + delta);
    const changeAmount = newPoints - currentPoints;

    const updatedRows = await sql`
      UPDATE members SET points = ${newPoints} WHERE id = ${currentMember.id} AND tenant_id = ${currentMember.tenant_id} RETURNING *;
    `;
    const member = updatedRows[0] || { ...currentMember, points: newPoints };

    const txId = `tx-${Date.now()}`;
    try {
      await sql`
        INSERT INTO point_transactions (id, member_id, change_amount, reason)
        VALUES (${txId}, ${currentMember.id}, ${changeAmount}, ${reason});
      `;
    } catch {}

    const finalPoints = Number(member.points || 0);
    let tier = 'SILVER';
    if (finalPoints >= 2000) tier = 'PLATINUM';
    else if (finalPoints >= 1000) tier = 'GOLD VIP';

    return res.json({
      success: true,
      member,
      newPoints: finalPoints,
      points: finalPoints,
      objectId: member.google_object_id || rawId,
      loyaltyPoints: { balance: { int: finalPoints }, label: 'Points' },
      tier,
      lockScreenPushSent: true,
      updatedAt: new Date().toISOString(),
      message: 'Points updated and synced with database',
    });
  } catch (err: any) {
    console.error('[Neon Postgres] UPDATE points error:', err);
    return res.status(500).json({ error: err?.message || 'Database error' });
  }
}

app.patch('/api/passes/:objectId/points', (req: Request, res: Response) => {
  return handleMemberPointsUpdate(req, req.params.objectId, req.body, res);
});

app.post('/api/members/:id/points', (req: Request, res: Response) => {
  return handleMemberPointsUpdate(req, req.params.id, req.body, res);
});

app.patch('/api/members/:id/points', (req: Request, res: Response) => {
  return handleMemberPointsUpdate(req, req.params.id, req.body, res);
});

// GET /api/tenants/:id/billing - SaaS Billing & Limits (strictly tenant-scoped)
app.get('/api/tenants/:id/billing', async (req: Request, res: Response) => {
  const auth = verifyAuthToken(req);
  if (!auth) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  await ensureMigration();
  if (!sql) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  const targetId = req.params.id;
  if (!isAdminRole(auth.role) && targetId !== auth.tenantId && targetId !== auth.tenantSlug) {
    return res.status(403).json({ error: 'Forbidden: cross-tenant access denied' });
  }

  try {
    const rows = !isAdminRole(auth.role)
      ? await sql`
          SELECT t.id, t.slug, t.name, t.plan, t.pass_limit, COUNT(m.id)::int as pass_count
          FROM tenants t
          LEFT JOIN members m ON m.tenant_id = t.id
          WHERE t.id = ${auth.tenantId}
          GROUP BY t.id, t.slug, t.name, t.plan, t.pass_limit LIMIT 1;
        `
      : await sql`
          SELECT t.id, t.slug, t.name, t.plan, t.pass_limit, COUNT(m.id)::int as pass_count
          FROM tenants t
          LEFT JOIN members m ON m.tenant_id = t.id
          WHERE t.id = ${targetId} OR t.slug = ${targetId}
          GROUP BY t.id, t.slug, t.name, t.plan, t.pass_limit LIMIT 1;
        `;

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const r = rows[0];
    const planKey = (r.plan || 'growth').toLowerCase() as 'starter' | 'growth' | 'scale';
    const planCosts = { starter: 49, growth: 149, scale: 399 };
    const passCount = Number(r.pass_count || 0);
    const passLimit = Number(r.pass_limit || (planKey === 'scale' ? 50000 : planKey === 'starter' ? 500 : 5000));

    return res.json({
      tenantId: r.id,
      slug: r.slug,
      storeName: r.name,
      plan: planKey,
      monthlyCost: planCosts[planKey] || 149,
      passUsage: {
        current: passCount,
        limit: passLimit,
        percentage: passLimit > 0 ? Math.min(100, Math.round((passCount / passLimit) * 1000) / 10) : 0,
      },
      billingCycleEnd: '2026-12-01T00:00:00Z',
      masterIssuerStatus: `Active (Issuer ID: ${MASTER_ISSUER_ID})`,
    });
  } catch (err) {
    console.error('[Neon Postgres] GET billing error:', err);
    return res.status(500).json({ error: 'Database connection failed' });
  }
});

// Geo-Campaigns & Smart Tap Proximity Push Endpoints (Strictly Tenant-Isolated)
async function ensureGeoCampaignsTable() {
  if (!sql) return;
  await sql`
    CREATE TABLE IF NOT EXISTS geo_campaigns (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      title TEXT NOT NULL,
      push_title TEXT NOT NULL,
      push_body TEXT NOT NULL,
      segment TEXT DEFAULT 'all',
      radius_meters INT DEFAULT 300,
      trigger_rule TEXT DEFAULT 'entry',
      cadence TEXT DEFAULT 'proximity',
      action_label TEXT DEFAULT 'View Offer',
      venue_label TEXT DEFAULT '',
      hero_sync BOOLEAN DEFAULT TRUE,
      status TEXT DEFAULT 'Active',
      taps_today INT DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;
}

function mapGeoCampaignRow(r: any) {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    storeName: r.store_name || '',
    storeSlug: r.store_slug || '',
    title: r.title,
    pushTitle: r.push_title,
    pushBody: r.push_body,
    segment: r.segment || 'all',
    radiusMeters: Number(r.radius_meters || 300),
    triggerRule: r.trigger_rule || 'entry',
    cadence: r.cadence || 'proximity',
    actionLabel: r.action_label || 'View Offer',
    venueLabel: r.venue_label || '',
    heroSync: Boolean(r.hero_sync),
    status: r.status || 'Active',
    tapsToday: Number(r.taps_today || 0),
    createdAt: r.created_at || new Date().toISOString(),
  };
}

app.get('/api/geo-campaigns', async (req: Request, res: Response) => {
  const auth = verifyAuthToken(req);
  if (!auth) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  await ensureMigration();
  if (!sql) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  try {
    await ensureGeoCampaignsTable();
    const adminSlug = isAdminRole(auth.role) && typeof req.query?.slug === 'string' ? req.query.slug.trim() : '';

    const rows = !isAdminRole(auth.role)
      ? await sql`
          SELECT g.*, t.name as store_name, t.slug as store_slug
          FROM geo_campaigns g
          JOIN tenants t ON g.tenant_id = t.id
          WHERE g.tenant_id = ${auth.tenantId}
          ORDER BY g.created_at DESC;
        `
      : adminSlug
      ? await sql`
          SELECT g.*, t.name as store_name, t.slug as store_slug
          FROM geo_campaigns g
          JOIN tenants t ON g.tenant_id = t.id
          WHERE t.slug = ${adminSlug} OR t.id = ${adminSlug}
          ORDER BY g.created_at DESC;
        `
      : await sql`
          SELECT g.*, t.name as store_name, t.slug as store_slug
          FROM geo_campaigns g
          JOIN tenants t ON g.tenant_id = t.id
          ORDER BY g.created_at DESC;
        `;

    return res.status(200).json(rows.map(mapGeoCampaignRow));
  } catch (err: any) {
    console.error('[Neon Postgres] GET /api/geo-campaigns error:', err);
    return res.status(500).json({ error: err?.message || 'Failed to load geo campaigns' });
  }
});

app.post('/api/geo-campaigns', async (req: Request, res: Response) => {
  const auth = verifyAuthToken(req);
  if (!auth) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  await ensureMigration();
  if (!sql) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  const body = req.body || {};
  const title = String(body.title || '').trim();
  const pushTitle = String(body.pushTitle || '').trim();
  const pushBody = String(body.pushBody || '').trim();

  if (!title || !pushTitle || !pushBody) {
    return res.status(400).json({ error: 'Campaign title, notification title, and body are required' });
  }

  const segment = ['all', 'vip', 'silver'].includes(String(body.segment || '').toLowerCase())
    ? String(body.segment).toLowerCase()
    : 'all';
  const radiusMeters = [150, 300, 750].includes(Number(body.radiusMeters)) ? Number(body.radiusMeters) : 300;
  const triggerRule = ['entry', 'dwell', 'exit'].includes(String(body.triggerRule || '').toLowerCase())
    ? String(body.triggerRule).toLowerCase()
    : 'entry';
  const cadence = ['proximity', 'fixed', 'milestone'].includes(String(body.cadence || '').toLowerCase())
    ? String(body.cadence).toLowerCase()
    : 'proximity';
  const actionLabel = String(body.actionLabel || 'View Offer').trim().slice(0, 60);
  const venueLabel = String(body.venueLabel || '').trim().slice(0, 120);
  const heroSync = body.heroSync !== undefined ? Boolean(body.heroSync) : true;
  const status = String(body.status || (cadence === 'fixed' ? 'Scheduled' : 'Active')).trim();

  try {
    await ensureGeoCampaignsTable();

    let resolvedTenantId = auth.tenantId || '';
    let storeName = '';
    let storeSlug = '';

    if (isAdminRole(auth.role)) {
      const targetRef = String(body.slug || body.tenantSlug || body.tenantId || req.query?.slug || '').trim();
      if (!targetRef) {
        return res.status(400).json({ error: 'Select a target store first to dispatch a campaign' });
      }
      const tRows = await sql`
        SELECT id, name, slug FROM tenants WHERE slug = ${targetRef} OR id = ${targetRef} LIMIT 1;
      `;
      if (tRows.length === 0) {
        return res.status(404).json({ error: 'Target store tenant not found' });
      }
      resolvedTenantId = tRows[0].id;
      storeName = tRows[0].name;
      storeSlug = tRows[0].slug;
    } else {
      const tRows = await sql`
        SELECT id, name, slug FROM tenants WHERE id = ${auth.tenantId} LIMIT 1;
      `;
      if (tRows.length === 0) {
        return res.status(404).json({ error: 'Authenticated tenant not found' });
      }
      resolvedTenantId = tRows[0].id;
      storeName = tRows[0].name;
      storeSlug = tRows[0].slug;
    }

    const id = `geo-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const inserted = await sql`
      INSERT INTO geo_campaigns (
        id, tenant_id, title, push_title, push_body, segment, radius_meters,
        trigger_rule, cadence, action_label, venue_label, hero_sync, status, taps_today
      )
      VALUES (
        ${id}, ${resolvedTenantId}, ${title.slice(0, 120)}, ${pushTitle.slice(0, 60)},
        ${pushBody.slice(0, 140)}, ${segment}, ${radiusMeters}, ${triggerRule},
        ${cadence}, ${actionLabel}, ${venueLabel}, ${heroSync}, ${status}, 0
      )
      RETURNING *;
    `;

    const row = { ...inserted[0], store_name: storeName, store_slug: storeSlug };
    return res.status(201).json({
      success: true,
      campaign: mapGeoCampaignRow(row),
      message: `Geo-campaign dispatched for ${storeName}`,
    });
  } catch (err: any) {
    console.error('[Neon Postgres] POST /api/geo-campaigns error:', err);
    return res.status(500).json({ error: err?.message || 'Failed to dispatch geo-campaign' });
  }
});

app.post('/api/geo-campaigns/test-push', async (req: Request, res: Response) => {
  const auth = verifyAuthToken(req);
  if (!auth) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  await ensureMigration();
  if (!sql) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  const body = req.body || {};
  const segment = String(body.segment || 'all').toLowerCase();
  const pushTitle = String(body.pushTitle || 'Wallet Pass Proximity Alert').trim();

  try {
    let targetTenant: any = null;
    if (!isAdminRole(auth.role)) {
      const rows = await sql`SELECT id, name, slug, class_id FROM tenants WHERE id = ${auth.tenantId} LIMIT 1;`;
      targetTenant = rows[0] || null;
    } else {
      const ref = String(body.slug || body.tenantSlug || req.query?.slug || '').trim();
      if (ref) {
        const rows = await sql`SELECT id, name, slug, class_id FROM tenants WHERE slug = ${ref} OR id = ${ref} LIMIT 1;`;
        targetTenant = rows[0] || null;
      }
    }

    if (!targetTenant) {
      return res.status(404).json({ error: 'Target store tenant not found' });
    }

    const memberRows = await sql`
      SELECT id, points FROM members WHERE tenant_id = ${targetTenant.id};
    `;
    const matchingMembers = memberRows.filter((m: any) => {
      const pts = Number(m.points || 0);
      if (segment === 'vip') return pts >= 1000;
      if (segment === 'silver') return pts < 1000;
      return true;
    });

    return res.status(200).json({
      success: true,
      storeName: targetTenant.name,
      classId: targetTenant.class_id,
      segment,
      deliveredTo: matchingMembers.length,
      pushTitle,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[Neon Postgres] POST /api/geo-campaigns/test-push error:', err);
    return res.status(500).json({ error: err?.message || 'Test push dispatch failed' });
  }
});

app.patch('/api/geo-campaigns/:id', async (req: Request, res: Response) => {
  const auth = verifyAuthToken(req);
  if (!auth) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  await ensureMigration();
  if (!sql) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  const { id } = req.params;
  const body = req.body || {};

  try {
    await ensureGeoCampaignsTable();
    const updated = !isAdminRole(auth.role)
      ? await sql`
          UPDATE geo_campaigns
          SET
            status = COALESCE(${body.status ?? null}, status),
            title = COALESCE(${body.title ?? null}, title),
            push_title = COALESCE(${body.pushTitle ?? null}, push_title),
            push_body = COALESCE(${body.pushBody ?? null}, push_body),
            radius_meters = COALESCE(${body.radiusMeters ?? null}, radius_meters),
            trigger_rule = COALESCE(${body.triggerRule ?? null}, trigger_rule),
            cadence = COALESCE(${body.cadence ?? null}, cadence),
            action_label = COALESCE(${body.actionLabel ?? null}, action_label),
            venue_label = COALESCE(${body.venueLabel ?? null}, venue_label),
            hero_sync = COALESCE(${body.heroSync ?? null}, hero_sync)
          WHERE id = ${id} AND tenant_id = ${auth.tenantId}
          RETURNING *;
        `
      : await sql`
          UPDATE geo_campaigns
          SET
            status = COALESCE(${body.status ?? null}, status),
            title = COALESCE(${body.title ?? null}, title),
            push_title = COALESCE(${body.pushTitle ?? null}, push_title),
            push_body = COALESCE(${body.pushBody ?? null}, push_body),
            radius_meters = COALESCE(${body.radiusMeters ?? null}, radius_meters),
            trigger_rule = COALESCE(${body.triggerRule ?? null}, trigger_rule),
            cadence = COALESCE(${body.cadence ?? null}, cadence),
            action_label = COALESCE(${body.actionLabel ?? null}, action_label),
            venue_label = COALESCE(${body.venueLabel ?? null}, venue_label),
            hero_sync = COALESCE(${body.heroSync ?? null}, hero_sync)
          WHERE id = ${id}
          RETURNING *;
        `;

    if (updated.length === 0) {
      return res.status(404).json({ error: 'Geo-campaign not found for active store' });
    }

    return res.status(200).json({
      success: true,
      campaign: mapGeoCampaignRow(updated[0]),
    });
  } catch (err: any) {
    console.error('[Neon Postgres] PATCH /api/geo-campaigns/:id error:', err);
    return res.status(500).json({ error: err?.message || 'Failed to update geo-campaign' });
  }
});

app.delete('/api/geo-campaigns/:id', async (req: Request, res: Response) => {
  const auth = verifyAuthToken(req);
  if (!auth) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  await ensureMigration();
  if (!sql) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  const { id } = req.params;

  try {
    await ensureGeoCampaignsTable();
    const deleted = !isAdminRole(auth.role)
      ? await sql`
          DELETE FROM geo_campaigns WHERE id = ${id} AND tenant_id = ${auth.tenantId} RETURNING id;
        `
      : await sql`
          DELETE FROM geo_campaigns WHERE id = ${id} RETURNING id;
        `;

    if (deleted.length === 0) {
      return res.status(404).json({ error: 'Geo-campaign not found for active store' });
    }

    return res.status(200).json({ success: true, id: deleted[0].id });
  } catch (err: any) {
    console.error('[Neon Postgres] DELETE /api/geo-campaigns/:id error:', err);
    return res.status(500).json({ error: err?.message || 'Failed to delete geo-campaign' });
  }
});

// Card Program Rules & Coupons Management (Strictly Tenant-Isolated)
async function ensureProgramTables() {
  if (!sql) return;
  await sql`
    CREATE TABLE IF NOT EXISTS program_configs (
      tenant_id TEXT PRIMARY KEY,
      program_name TEXT NOT NULL,
      archetype TEXT DEFAULT 'loyalty',
      card_title TEXT DEFAULT '',
      barcode_mode TEXT DEFAULT 'barcode',
      welcome_active BOOLEAN DEFAULT TRUE,
      welcome_grant INT DEFAULT 100,
      earn_velocity INT DEFAULT 10,
      min_floor INT DEFAULT 500,
      tiers_json JSONB NOT NULL DEFAULT '[]'::jsonb,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS coupons (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      title TEXT NOT NULL,
      subtitle TEXT DEFAULT '',
      code TEXT DEFAULT '',
      points_cost INT DEFAULT 500,
      discount_amount NUMERIC(10,2) DEFAULT 5.00,
      icon TEXT DEFAULT 'redeem',
      active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;
}

function defaultTiers() {
  return [
    { id: 'tier-silver', name: 'Silver', multiplier: 1.0, minPoints: 0, label: 'Base Rate' },
    { id: 'tier-gold', name: 'Gold (Mid)', multiplier: 1.25, minPoints: 1500, label: '1,500 Pts' },
    { id: 'tier-vip', name: 'VIP Plat', multiplier: 1.5, minPoints: 4000, label: '4,000 Pts' },
  ];
}

function mapCouponRow(r: any) {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    title: r.title,
    subtitle: r.subtitle || '',
    code: r.code || '',
    pointsCost: Number(r.points_cost || 0),
    discountAmount: Number(r.discount_amount || 0),
    icon: r.icon || 'redeem',
    active: r.active !== false,
    createdAt: r.created_at || new Date().toISOString(),
  };
}

async function resolveScopedTenant(auth: AuthContext, requestedRef?: string) {
  if (!sql) return null;
  if (!isAdminRole(auth.role)) {
    const rows = await sql`
      SELECT id, slug, name, logo, color, archetype, class_id, owner_name, owner_email
      FROM tenants WHERE id = ${auth.tenantId} LIMIT 1;
    `;
    return rows[0] || null;
  }
  const ref = (requestedRef || '').trim();
  if (!ref) return null;
  const rows = await sql`
    SELECT id, slug, name, logo, color, archetype, class_id, owner_name, owner_email
    FROM tenants WHERE slug = ${ref} OR id = ${ref} LIMIT 1;
  `;
  return rows[0] || null;
}

app.get('/api/program-config', async (req: Request, res: Response) => {
  const auth = verifyAuthToken(req);
  if (!auth) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  await ensureMigration();
  if (!sql) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  try {
    await ensureProgramTables();
    const ref = typeof req.query?.slug === 'string' ? req.query.slug : undefined;
    const tenant = await resolveScopedTenant(auth, ref);
    if (!tenant) {
      return res.status(404).json({ error: 'Store tenant not found' });
    }

    const cfgRows = await sql`
      SELECT * FROM program_configs WHERE tenant_id = ${tenant.id} LIMIT 1;
    `;
    const couponRows = await sql`
      SELECT * FROM coupons WHERE tenant_id = ${tenant.id} ORDER BY created_at DESC;
    `;

    const cfg = cfgRows[0];
    const parsedTiers =
      cfg && Array.isArray(cfg.tiers_json) && cfg.tiers_json.length > 0
        ? cfg.tiers_json
        : defaultTiers();

    return res.status(200).json({
      tenant: {
        id: tenant.id,
        slug: tenant.slug,
        name: tenant.name,
        brandColor: tenant.color || '#ff5722',
        archetype: tenant.archetype || 'loyalty',
        classId: tenant.class_id || '',
      },
      config: {
        programName: cfg?.program_name || `${tenant.name} Club`,
        archetype: cfg?.archetype || tenant.archetype || 'loyalty',
        cardTitle: cfg?.card_title || `${tenant.name} Membership Card`,
        barcodeMode: cfg?.barcode_mode === 'qr' ? 'qr' : 'barcode',
        welcomeActive: cfg ? Boolean(cfg.welcome_active) : true,
        welcomeGrant: cfg ? Number(cfg.welcome_grant ?? 100) : 100,
        earnVelocity: cfg ? Number(cfg.earn_velocity ?? 10) : 10,
        minFloor: cfg ? Number(cfg.min_floor ?? 500) : 500,
        tiers: parsedTiers,
        updatedAt: cfg?.updated_at || null,
      },
      coupons: couponRows.map(mapCouponRow),
    });
  } catch (err: any) {
    console.error('[Neon Postgres] GET /api/program-config error:', err);
    return res.status(500).json({ error: err?.message || 'Failed to load program configuration' });
  }
});

app.put('/api/program-config', async (req: Request, res: Response) => {
  const auth = verifyAuthToken(req);
  if (!auth) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  await ensureMigration();
  if (!sql) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  const body = req.body || {};
  try {
    await ensureProgramTables();
    const ref = String(body.slug || body.tenantId || req.query?.slug || '');
    const tenant = await resolveScopedTenant(auth, ref);
    if (!tenant) {
      return res.status(404).json({ error: 'Target store tenant not found' });
    }

    const programName = String(body.programName || `${tenant.name} Club`).trim().slice(0, 80);
    const archetype = ['loyalty', 'gift', 'ticket'].includes(String(body.archetype || '').toLowerCase())
      ? String(body.archetype).toLowerCase()
      : tenant.archetype || 'loyalty';
    const cardTitle = String(body.cardTitle || `${tenant.name} Card`).trim().slice(0, 80);
    const barcodeMode = body.barcodeMode === 'qr' ? 'qr' : 'barcode';
    const welcomeActive = body.welcomeActive !== undefined ? Boolean(body.welcomeActive) : true;
    const welcomeGrant = Math.max(0, Math.min(50000, Math.round(Number(body.welcomeGrant ?? 100))));
    const earnVelocity = Math.max(1, Math.min(500, Math.round(Number(body.earnVelocity ?? 10))));
    const minFloor = Math.max(50, Math.min(50000, Math.round(Number(body.minFloor ?? 500))));
    const tiers = Array.isArray(body.tiers) && body.tiers.length > 0 ? body.tiers : defaultTiers();

    if (body.storeName || body.brandColor) {
      await sql`
        UPDATE tenants
        SET
          name = COALESCE(${body.storeName ? String(body.storeName).trim() : null}, name),
          color = COALESCE(${body.brandColor ? String(body.brandColor).trim() : null}, color),
          archetype = ${archetype}
        WHERE id = ${tenant.id};
      `;
    }

    const saved = await sql`
      INSERT INTO program_configs (
        tenant_id, program_name, archetype, card_title, barcode_mode,
        welcome_active, welcome_grant, earn_velocity, min_floor, tiers_json, updated_at
      )
      VALUES (
        ${tenant.id}, ${programName}, ${archetype}, ${cardTitle}, ${barcodeMode},
        ${welcomeActive}, ${welcomeGrant}, ${earnVelocity}, ${minFloor}, ${JSON.stringify(tiers)}::jsonb, NOW()
      )
      ON CONFLICT (tenant_id) DO UPDATE SET
        program_name = EXCLUDED.program_name,
        archetype = EXCLUDED.archetype,
        card_title = EXCLUDED.card_title,
        barcode_mode = EXCLUDED.barcode_mode,
        welcome_active = EXCLUDED.welcome_active,
        welcome_grant = EXCLUDED.welcome_grant,
        earn_velocity = EXCLUDED.earn_velocity,
        min_floor = EXCLUDED.min_floor,
        tiers_json = EXCLUDED.tiers_json,
        updated_at = NOW()
      RETURNING *;
    `;

    const row = saved[0];
    return res.status(200).json({
      success: true,
      config: {
        programName: row.program_name,
        archetype: row.archetype,
        cardTitle: row.card_title,
        barcodeMode: row.barcode_mode,
        welcomeActive: Boolean(row.welcome_active),
        welcomeGrant: Number(row.welcome_grant),
        earnVelocity: Number(row.earn_velocity),
        minFloor: Number(row.min_floor),
        tiers: row.tiers_json,
        updatedAt: row.updated_at,
      },
      message: 'Program rules & card configuration saved',
    });
  } catch (err: any) {
    console.error('[Neon Postgres] PUT /api/program-config error:', err);
    return res.status(500).json({ error: err?.message || 'Failed to save program configuration' });
  }
});

app.post('/api/coupons', async (req: Request, res: Response) => {
  const auth = verifyAuthToken(req);
  if (!auth) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  await ensureMigration();
  if (!sql) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  const body = req.body || {};
  const title = String(body.title || '').trim();
  if (!title) {
    return res.status(400).json({ error: 'Coupon title is required' });
  }

  try {
    await ensureProgramTables();
    const ref = String(body.slug || body.tenantId || req.query?.slug || '');
    const tenant = await resolveScopedTenant(auth, ref);
    if (!tenant) {
      return res.status(404).json({ error: 'Target store tenant not found' });
    }

    const id = `cpn-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const subtitle = String(body.subtitle || 'Redeemable in-store').trim().slice(0, 120);
    const code = String(body.code || `CPN${Math.floor(100 + Math.random() * 900)}`).trim().toUpperCase().slice(0, 24);
    const pointsCost = Math.max(0, Math.round(Number(body.pointsCost ?? 500)));
    const discountAmount = Math.max(0, Number(body.discountAmount ?? 5));
    const icon = String(body.icon || 'redeem').trim().slice(0, 40);
    const active = body.active !== undefined ? Boolean(body.active) : true;

    const inserted = await sql`
      INSERT INTO coupons (id, tenant_id, title, subtitle, code, points_cost, discount_amount, icon, active)
      VALUES (${id}, ${tenant.id}, ${title.slice(0, 80)}, ${subtitle}, ${code}, ${pointsCost}, ${discountAmount}, ${icon}, ${active})
      RETURNING *;
    `;

    return res.status(201).json({
      success: true,
      coupon: mapCouponRow(inserted[0]),
    });
  } catch (err: any) {
    console.error('[Neon Postgres] POST /api/coupons error:', err);
    return res.status(500).json({ error: err?.message || 'Failed to create coupon' });
  }
});

app.patch('/api/coupons/:id', async (req: Request, res: Response) => {
  const auth = verifyAuthToken(req);
  if (!auth) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  await ensureMigration();
  if (!sql) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  const { id } = req.params;
  const body = req.body || {};

  try {
    await ensureProgramTables();
    const updated = !isAdminRole(auth.role)
      ? await sql`
          UPDATE coupons
          SET
            title = COALESCE(${body.title ? String(body.title).trim().slice(0, 80) : null}, title),
            subtitle = COALESCE(${body.subtitle !== undefined ? String(body.subtitle).trim().slice(0, 120) : null}, subtitle),
            code = COALESCE(${body.code ? String(body.code).trim().toUpperCase().slice(0, 24) : null}, code),
            points_cost = COALESCE(${body.pointsCost !== undefined ? Math.max(0, Math.round(Number(body.pointsCost))) : null}, points_cost),
            discount_amount = COALESCE(${body.discountAmount !== undefined ? Math.max(0, Number(body.discountAmount)) : null}, discount_amount),
            icon = COALESCE(${body.icon ? String(body.icon).trim().slice(0, 40) : null}, icon),
            active = COALESCE(${body.active !== undefined ? Boolean(body.active) : null}, active)
          WHERE id = ${id} AND tenant_id = ${auth.tenantId}
          RETURNING *;
        `
      : await sql`
          UPDATE coupons
          SET
            title = COALESCE(${body.title ? String(body.title).trim().slice(0, 80) : null}, title),
            subtitle = COALESCE(${body.subtitle !== undefined ? String(body.subtitle).trim().slice(0, 120) : null}, subtitle),
            code = COALESCE(${body.code ? String(body.code).trim().toUpperCase().slice(0, 24) : null}, code),
            points_cost = COALESCE(${body.pointsCost !== undefined ? Math.max(0, Math.round(Number(body.pointsCost))) : null}, points_cost),
            discount_amount = COALESCE(${body.discountAmount !== undefined ? Math.max(0, Number(body.discountAmount)) : null}, discount_amount),
            icon = COALESCE(${body.icon ? String(body.icon).trim().slice(0, 40) : null}, icon),
            active = COALESCE(${body.active !== undefined ? Boolean(body.active) : null}, active)
          WHERE id = ${id}
          RETURNING *;
        `;

    if (updated.length === 0) {
      return res.status(404).json({ error: 'Coupon not found for active store' });
    }

    return res.status(200).json({
      success: true,
      coupon: mapCouponRow(updated[0]),
    });
  } catch (err: any) {
    console.error('[Neon Postgres] PATCH /api/coupons/:id error:', err);
    return res.status(500).json({ error: err?.message || 'Failed to update coupon' });
  }
});

app.delete('/api/coupons/:id', async (req: Request, res: Response) => {
  const auth = verifyAuthToken(req);
  if (!auth) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  await ensureMigration();
  if (!sql) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  const { id } = req.params;
  try {
    await ensureProgramTables();
    const deleted = !isAdminRole(auth.role)
      ? await sql`DELETE FROM coupons WHERE id = ${id} AND tenant_id = ${auth.tenantId} RETURNING id;`
      : await sql`DELETE FROM coupons WHERE id = ${id} RETURNING id;`;

    if (deleted.length === 0) {
      return res.status(404).json({ error: 'Coupon not found for active store' });
    }
    return res.status(200).json({ success: true, id: deleted[0].id });
  } catch (err: any) {
    console.error('[Neon Postgres] DELETE /api/coupons/:id error:', err);
    return res.status(500).json({ error: err?.message || 'Failed to delete coupon' });
  }
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
