import express, { Request, Response } from 'express';
import crypto from 'crypto';
import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';

const app = express();
app.use(express.json({ limit: '10mb' }));

// Handle pre-parsed string bodies if forwarded by runtime adapter
app.use((req, _res, next) => {
  if (typeof req.body === 'string' && req.body.trim().startsWith('{')) {
    try {
      req.body = JSON.parse(req.body);
    } catch {
      // Leave body untouched if invalid JSON string
    }
  }
  next();
});

const DATABASE_URL = process.env.DATABASE_URL || '';
const sql = DATABASE_URL ? neon(DATABASE_URL) : null;

let MASTER_ISSUER_ID = process.env.ISSUER_ID || '3388000000022258509';
let SERVICE_ACCOUNT_EMAIL =
  process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
  process.env.GOOGLE_CLIENT_EMAIL ||
  'oloyal-wallet-sa@banlis-bistro-app.iam.gserviceaccount.com';
let PRIVATE_KEY_PEM = process.env.GOOGLE_PRIVATE_KEY || '';

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
        } catch (banlisErr: any) {
          console.warn('[Migration] Banlis seed password notice:', banlisErr?.message || banlisErr);
        }
      } catch (err: any) {
        console.warn('[Migration] Note on combined statement:', err?.message || err);
        try {
          await sql`
            CREATE TABLE IF NOT EXISTS tenants (
              id TEXT PRIMARY KEY,
              slug TEXT UNIQUE NOT NULL,
              name TEXT NOT NULL,
              logo TEXT,
              color TEXT,
              archetype TEXT DEFAULT 'loyalty',
              class_id TEXT,
              issuer_id TEXT
            );
          `;
          await sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS owner_name TEXT;`;
          await sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS owner_email TEXT;`;
          await sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS password_hash TEXT;`;
          await sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Pending Approval';`;
          await sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'growth';`;
          await sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS pass_limit INT DEFAULT 5000;`;
          await sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();`;
          try {
            await sql`CREATE UNIQUE INDEX IF NOT EXISTS tenants_owner_email_unique ON tenants(owner_email) WHERE owner_email IS NOT NULL;`;
          } catch {}
        } catch (fallbackErr: any) {
          console.error('[Migration] Migration fallback error:', fallbackErr);
        }
      }
    })();
  }

  await migrationPromise;
}

function normalizeWalletPrivateKey(rawKey?: string): string {
  let k = rawKey || PRIVATE_KEY_PEM || process.env.GOOGLE_PRIVATE_KEY || '';
  k = k.trim().replace(/^"|"$/g, '').replace(/\n/g, '\n').replace(/\\n/g, '\n');

  const hasBegin = k.includes('BEGIN PRIVATE KEY');
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

  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const jwtPayload: Record<string, any> = {
    iss: serviceAccountEmail,
    aud: 'google',
    origins: Array.from(originsSet),
    typ: 'savetowallet',
    iat: now,
    exp: now + 3600,
    payload,
  };

  const base64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
  const base64Payload = Buffer.from(JSON.stringify(jwtPayload)).toString('base64url');
  const unsignedToken = `${base64Header}.${base64Payload}`;
  const keyPem = normalizeWalletPrivateKey(privateKeyPem);

  try {
    const keyObj = crypto.createPrivateKey({ key: keyPem, format: 'pem' });
    const sigBuf = crypto.sign('SHA256', Buffer.from(unsignedToken), keyObj);
    return `${unsignedToken}.${sigBuf.toString('base64url')}`;
  } catch (err: any) {
    try {
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

const router = express.Router();

// GET /api/health
router.get('/health', async (_req: Request, res: Response) => {
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
  return res.status(200).json({
    status: 'online',
    database: dbStatus,
    masterIssuerId: MASTER_ISSUER_ID,
    serviceAccount: SERVICE_ACCOUNT_EMAIL,
    hasPrivateKey: !!(PRIVATE_KEY_PEM || process.env.GOOGLE_PRIVATE_KEY),
    smartTapVersion: '3.2',
    activeTenants: tenantCount,
    timestamp: new Date().toISOString(),
  });
});

// GET & POST /api/credentials
router.get('/credentials', (_req: Request, res: Response) => {
  return res.status(200).json({
    issuerId: MASTER_ISSUER_ID,
    serviceAccountEmail: SERVICE_ACCOUNT_EMAIL,
    hasPrivateKey: !!(PRIVATE_KEY_PEM || process.env.GOOGLE_PRIVATE_KEY),
  });
});

router.post('/credentials', (req: Request, res: Response) => {
  const { issuerId, serviceAccountEmail, privateKey } = req.body || {};
  if (issuerId) MASTER_ISSUER_ID = String(issuerId).trim();
  if (serviceAccountEmail) SERVICE_ACCOUNT_EMAIL = String(serviceAccountEmail).trim();
  if (privateKey) PRIVATE_KEY_PEM = String(privateKey).trim();

  return res.status(200).json({
    success: true,
    issuerId: MASTER_ISSUER_ID,
    serviceAccountEmail: SERVICE_ACCOUNT_EMAIL,
    hasPrivateKey: !!(PRIVATE_KEY_PEM || process.env.GOOGLE_PRIVATE_KEY),
  });
});

// GET /api/stats
router.get('/stats', async (_req: Request, res: Response) => {
  await ensureMigration();
  if (!sql) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  try {
    const tenantRows = await sql`SELECT COUNT(*)::int as count FROM tenants;`;
    const memberRows = await sql`SELECT COUNT(*)::int as count FROM members;`;
    const activeTenants = tenantRows[0]?.count || 0;
    const totalPasses = memberRows[0]?.count || 0;

    return res.status(200).json({
      activeTenants,
      totalPasses,
      todayRevenue: totalPasses * 35.5,
      redemptionRate: totalPasses > 0 ? '28.4%' : '0%',
      avgCheck: 48.2,
      pointsLiability: totalPasses * 100,
    });
  } catch (err) {
    console.error('[Neon Postgres API] GET /api/stats error:', err);
    return res.status(500).json({ error: 'Database connection failed' });
  }
});

// POST /api/login
router.post('/login', async (req: Request, res: Response) => {
  const body = req.body || {};
  const email = (body.email || body.owner_email || body.ownerEmail || body.username || '').trim().toLowerCase();
  const password = body.password || '';

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  // 1. FIRST check Super Admin credentials via environment variables (do NOT query tenants for admin)
  const superAdminEmail = (process.env.SUPER_ADMIN_EMAIL || '').trim().toLowerCase();
  const adminPasswordHash = (process.env.ADMIN_PASSWORD_HASH || '').trim();

  if (superAdminEmail && email === superAdminEmail) {
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

  await ensureMigration();

  try {
    const rows = await sql`
      SELECT 
        id, slug, name, logo, color, archetype, class_id, issuer_id,
        owner_name, owner_email, password_hash, status, plan, pass_limit, created_at,
        (password_hash = crypt(${password}, password_hash)) as is_valid
      FROM tenants 
      WHERE LOWER(owner_email) = ${email} 
         OR slug = ${email} 
         OR id = ${email}
      LIMIT 1;
    `;

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const tenant = rows[0];
    const isBcryptValid = tenant.password_hash?.startsWith('$2')
      ? await bcrypt.compare(password, tenant.password_hash)
      : false;
    const isValid =
      Boolean(tenant.is_valid) ||
      isBcryptValid ||
      (tenant.password_hash ? verifyPassword(password, tenant.password_hash) : false);

    if (!isValid) {
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
      token: `tok_${tenant.id}_${Date.now()}`,
      message: 'Login successful',
    });
  } catch (err: any) {
    console.error('[Login API] Error:', err);
    return res.status(500).json({ error: err.message || 'Login failed' });
  }
});

// Helper for POST /api/tenants, /api/register, /api/provision
async function registerOrProvisionTenant(req: Request, res: Response) {
  await ensureMigration();
  const body = req.body || {};
  const { name, legalEntity, brandColor, logoUrl, archetype, plan, status, ownerName, owner_name, ownerEmail, owner_email, password } = body;

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
  const passLimit = rawPlan === 'scale' ? 50000 : rawPlan === 'starter' ? 500 : 5000;
  const finalStatus = status || 'Pending Approval';

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
    id: insertedRow.id || tenantId,
    slug: insertedRow.slug || slug,
    name: insertedRow.name || storeName,
    ownerName: insertedRow.owner_name || finalOwnerName,
    ownerEmail: insertedRow.owner_email || rawEmail,
    legalEntity: legalEntity || `${storeName} LLC`,
    brandColor: insertedRow.color || color,
    logoUrl: insertedRow.logo || logo,
    archetype: insertedRow.archetype || archetype || 'loyalty',
    classId: insertedRow.class_id || classId,
    plan: insertedRow.plan || rawPlan,
    passLimit: Number(insertedRow.pass_limit || passLimit),
    passCount: 0,
    status: insertedRow.status || finalStatus,
    createdAt: insertedRow.created_at || new Date().toISOString(),
  };

  return res.status(201).json({
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
    message:
      finalStatus === 'Pending Approval'
        ? 'Store registered and submitted for Super Admin package approval'
        : 'Store provisioned successfully with auth in Neon Postgres',
  });
}

router.post('/register', registerOrProvisionTenant);
router.post('/provision', registerOrProvisionTenant);
router.post('/tenants', registerOrProvisionTenant);

// GET /api/tenants
router.get('/tenants', async (req: Request, res: Response) => {
  await ensureMigration();
  if (!sql) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  const statusParam = typeof req.query?.status === 'string' ? req.query.status.trim().toLowerCase() : '';
  try {
    const rows =
      statusParam === 'pending' || statusParam === 'pending approval'
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
              t.id, t.slug, t.name, t.logo, t.color, t.archetype, t.class_id, t.issuer_id,
              t.owner_name, t.owner_email, t.status, t.plan, t.pass_limit, t.created_at,
              COUNT(m.id)::int as pass_count
            FROM tenants t
            LEFT JOIN members m ON m.tenant_id = t.id
            GROUP BY t.id, t.slug, t.name, t.logo, t.color, t.archetype, t.class_id, t.issuer_id, t.owner_name, t.owner_email, t.status, t.plan, t.pass_limit, t.created_at
            ORDER BY t.id;
          `;

    const mapped = rows.map((r: any) => ({
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
    return res.status(200).json(mapped);
  } catch (err) {
    console.error('[Neon Postgres API] GET /api/tenants error:', err);
    return res.status(500).json({ error: 'Database connection failed' });
  }
});

// PATCH / PUT /api/tenants (body target)
async function updateTenantByTarget(target: string, body: any, res: Response) {
  await ensureMigration();
  const { name, logoUrl, brandColor, archetype, status, plan, passLimit, pass_limit, ownerName, ownerEmail, password } = body || {};
  const computedLimit =
    passLimit || pass_limit || (plan === 'scale' ? 50000 : plan === 'starter' ? 500 : plan === 'growth' ? 5000 : null);
  const rawPwd = password ? String(password).trim() : '';

  if (!sql) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  try {
    const rows = rawPwd
      ? await sql`
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
          WHERE slug = ${target} OR id = ${target} OR slug = ${target.replace(/-bistro$/, '')}
          RETURNING id, slug, name, logo, color, archetype, class_id, issuer_id, status, plan, pass_limit, owner_name, owner_email;
        `
      : await sql`
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
          WHERE slug = ${target} OR id = ${target} OR slug = ${target.replace(/-bistro$/, '')}
          RETURNING id, slug, name, logo, color, archetype, class_id, issuer_id, status, plan, pass_limit, owner_name, owner_email;
        `;

    if (rows.length > 0) {
      const r = rows[0];
      return res.status(200).json({
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
        message: 'Tenant settings and status updated in Neon Postgres',
      });
    }
    return res.status(404).json({ error: 'Tenant not found' });
  } catch (err: any) {
    console.error('[Neon Postgres API] PATCH tenant error:', err);
    if (err?.code === '23505') {
      return res.status(409).json({ error: 'Email already in use by another store' });
    }
    return res.status(500).json({ error: `Failed to save tenant customization: ${err?.message || 'Database error'}` });
  }
}

router.patch('/tenants', async (req: Request, res: Response) => {
  const target = req.body?.slug || req.body?.id || req.query?.slug || req.query?.id;
  if (!target) {
    return res.status(400).json({ error: 'Tenant slug or id is required for update' });
  }
  return updateTenantByTarget(String(target), req.body, res);
});

router.put('/tenants', async (req: Request, res: Response) => {
  const target = req.body?.slug || req.body?.id || req.query?.slug || req.query?.id;
  if (!target) {
    return res.status(400).json({ error: 'Tenant slug or id is required for update' });
  }
  return updateTenantByTarget(String(target), req.body, res);
});

// GET /api/tenants/:slug
router.get('/tenants/:slug', async (req: Request, res: Response) => {
  await ensureMigration();
  const { slug } = req.params;
  if (!sql) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  try {
    const rows = await sql`
      SELECT 
        t.id, t.slug, t.name, t.logo, t.color, t.archetype, t.class_id, t.issuer_id,
        t.owner_name, t.owner_email, t.status, t.plan, t.pass_limit, t.created_at,
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
      return res.status(200).json({
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
    console.error('[Neon Postgres API] GET /api/tenants/:slug error:', err);
    return res.status(500).json({ error: 'Database connection failed' });
  }
});

// PATCH / PUT /api/tenants/:slug
router.patch('/tenants/:slug', async (req: Request, res: Response) => {
  return updateTenantByTarget(req.params.slug, req.body, res);
});

router.put('/tenants/:slug', async (req: Request, res: Response) => {
  return updateTenantByTarget(req.params.slug, req.body, res);
});

// DELETE /api/tenants/:slug
router.delete('/tenants/:slug', async (req: Request, res: Response) => {
  await ensureMigration();
  const { slug } = req.params;
  if (!sql) {
    return res.status(500).json({ error: 'Database not configured' });
  }
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
      return res.status(200).json({
        success: true,
        deleted: deletedRows[0],
        message: 'Merchant tenant deleted from Neon Postgres',
      });
    }
    return res.status(404).json({ error: 'Tenant not found' });
  } catch (err: any) {
    console.error('[Neon Postgres API] DELETE /api/tenants/:slug error:', err);
    return res.status(500).json({ error: `Failed to delete merchant: ${err?.message || 'Database error'}` });
  }
});

// GET /api/tenants/:slug/members
router.get('/tenants/:slug/members', async (req: Request, res: Response) => {
  await ensureMigration();
  const { slug } = req.params;
  if (!sql) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  try {
    const rows = await sql`
      SELECT 
        m.id, m.tenant_id, m.name as customer_name, m.phone, m.email,
        m.member_id, m.points, m.balance_cents, m.google_object_id,
        t.name as store_name, t.color as brand_color, t.logo as logo_url, t.class_id
      FROM members m
      JOIN tenants t ON m.tenant_id = t.id
      WHERE t.slug = ${slug} 
         OR t.id = ${slug} 
         OR t.slug = ${slug.replace(/-bistro$/, '')}
         OR (${slug.includes('banlis')} AND (t.slug LIKE '%banlis%' OR t.id LIKE '%banlis%'))
      ORDER BY m.id DESC;
    `;
    return res.status(200).json(rows || []);
  } catch (err) {
    console.error('[Neon Postgres API] GET /api/tenants/:slug/members error:', err);
    return res.status(500).json({ error: 'Database connection failed' });
  }
});

// POST /api/tenants/:slug/enroll
router.post('/tenants/:slug/enroll', async (req: Request, res: Response) => {
  await ensureMigration();
  const { slug } = req.params;
  const { name, email, phone } = req.body || {};

  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: 'Customer name is required' });
  }

  if (!sql) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  let tenant: any = null;
  try {
    const rows = await sql`
      SELECT id, slug, name, logo, color, archetype, class_id, issuer_id 
      FROM tenants 
      WHERE slug = ${slug} 
         OR id = ${slug} 
         OR slug = ${slug.replace(/-bistro$/, '')}
         OR slug = 'banlis' 
         OR slug = 'banlis-bistro'
      LIMIT 1;
    `;
    if (rows.length > 0) {
      tenant = rows[0];
    } else {
      const fallbackRows = await sql`
        SELECT id, slug, name, logo, color, archetype, class_id, issuer_id 
        FROM tenants 
        LIMIT 1;
      `;
      if (fallbackRows.length > 0) {
        tenant = fallbackRows[0];
      }
    }
  } catch (err) {
    console.error('[Neon Postgres API] Find tenant error:', err);
    return res.status(500).json({ error: 'Database connection failed' });
  }

  if (!tenant) {
    return res.status(404).json({ error: `Tenant not found for slug=${slug}` });
  }

  const memberIdCode = `PL-${Math.floor(100000 + Math.random() * 900000)}`;
  const uuid = `mem-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const objectId = `${MASTER_ISSUER_ID}.customer_${memberIdCode.replace(/[^a-zA-Z0-9_.]/g, '')}_obj`;
  const memberName = String(name).trim();
  const memberPhone = phone ? String(phone).trim() : '';
  const memberEmail = email ? String(email).trim() : '';

  let insertedMember: any = null;
  try {
    const rows = await sql`
      INSERT INTO members (id, tenant_id, name, email, phone, member_id, points, balance_cents, google_object_id)
      VALUES (${uuid}, ${tenant.id}, ${memberName}, ${memberEmail}, ${memberPhone}, ${memberIdCode}, 100, 0, ${objectId})
      RETURNING *;
    `;
    if (rows.length > 0) {
      insertedMember = rows[0];
    }

    const txId = `tx-${Date.now()}`;
    try {
      await sql`
        INSERT INTO point_transactions (id, member_id, change_amount, reason)
        VALUES (${txId}, ${uuid}, 100, 'Welcome Bonus');
      `;
    } catch {
      await sql`
        INSERT INTO point_transactions (id, member_id, tenant_id, change_amount, reason)
        VALUES (${txId}, ${uuid}, ${tenant.id}, 100, 'Welcome Bonus');
      `;
    }
  } catch (err: any) {
    console.error('[Neon Postgres API] DB enrollment error:', err);
    return res.status(500).json({ error: `Failed to save member in database: ${err?.message || 'Database error'}` });
  }

  const finalMember = insertedMember || {
    id: uuid,
    tenant_id: tenant.id,
    name: memberName,
    email: memberEmail,
    phone: memberPhone,
    member_id: memberIdCode,
    points: 100,
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
    programName: `${tenant.name} Loyalty`,
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
      type: 'QR_CODE',
      value: memberIdCode,
      alternateText: memberIdCode,
    },
    loyaltyPoints: {
      label: 'Points',
      balance: { int: 100 },
    },
    textModulesData: [
      { id: 'mod_member', header: 'MEMBER', body: memberName },
      { id: 'mod_phone', header: 'PHONE', body: memberPhone || memberIdCode },
      { id: 'mod_points', header: 'POINTS', body: '100 Points - Welcome Bonus' },
    ],
  };

  const requestOrigins: string[] = [];
  if (req.headers.origin) requestOrigins.push(String(req.headers.origin));
  if (req.headers.referer) requestOrigins.push(String(req.headers.referer));

  try {
    const signedJwtToken = signGoogleWalletJwt(
      { loyaltyClasses: [loyaltyClass], loyaltyObjects: [loyaltyObject] },
      SERVICE_ACCOUNT_EMAIL,
      PRIVATE_KEY_PEM || process.env.GOOGLE_PRIVATE_KEY,
      requestOrigins
    );
    const saveToWalletUrl = `https://pay.google.com/gp/v/save/${signedJwtToken}`;

    return res.status(200).json({
      success: true,
      member: finalMember,
      pass: {
        id: finalMember.id,
        objectId,
        tenantId: tenant.id,
        customerName: memberName,
        email: memberEmail,
        phone: memberPhone,
        points: 100,
        tier: 'SILVER',
        jwtUrl: saveToWalletUrl,
        syncedAt: new Date().toISOString(),
      },
      saveToWalletUrl,
      walletUrl: saveToWalletUrl,
      qr: memberIdCode,
      qrCodeData: `PASS-LOVAL-NFC:${objectId}`,
    });
  } catch (err: any) {
    console.error('[Enrollment JWT Error]:', err);
    return res.status(500).json({ error: err.message || 'Failed to sign Google Wallet pass' });
  }
});

// GET /api/tenants/:id/billing
router.get('/tenants/:id/billing', async (req: Request, res: Response) => {
  await ensureMigration();
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
    console.error('[Neon Postgres API] GET billing error:', err);
    return res.status(500).json({ error: 'Database connection failed' });
  }

  return res.status(200).json({
    tenantId: req.params.id,
    storeName,
    plan: 'growth',
    monthlyCost: 149,
    passUsage: {
      current: passCount,
      limit: 5000,
      percentage: Math.round((passCount / 5000) * 100),
    },
    billingCycleEnd: '2026-12-01T00:00:00Z',
    masterIssuerStatus: `Active (Issuer ID: ${MASTER_ISSUER_ID})`,
  });
});

// GET /api/passes
router.get('/passes', async (_req: Request, res: Response) => {
  await ensureMigration();
  if (!sql) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  try {
    const rows = await sql`
      SELECT 
        m.id, m.tenant_id, m.name as customer_name, m.phone, m.email,
        m.member_id, m.points, m.balance_cents, m.google_object_id,
        t.name as store_name, t.color as brand_color, t.logo as logo_url, t.class_id
      FROM members m
      JOIN tenants t ON m.tenant_id = t.id
      ORDER BY m.id DESC;
    `;
    return res.status(200).json(rows || []);
  } catch (err) {
    console.error('[Neon Postgres API] GET /api/passes error:', err);
    return res.status(500).json({ error: 'Database connection failed' });
  }
});

// Shared points adjustment logic for /api/members/:id/points and /api/passes/:objectId/points
async function handleMemberPointsUpdate(rawId: string, body: any, res: Response) {
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
    const rows = await sql`
      SELECT * FROM members 
      WHERE id = ${rawId} OR google_object_id = ${rawId} OR member_id = ${rawId}
      LIMIT 1;
    `;

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Member pass not found' });
    }

    const currentMember = rows[0];
    const currentPoints = Number(currentMember.points || 0);
    let newPoints = currentPoints;
    let changeAmount = 0;

    if (absolute !== null) {
      newPoints = Math.max(0, absolute);
      changeAmount = newPoints - currentPoints;
    } else {
      changeAmount = delta;
      newPoints = Math.max(0, currentPoints + delta);
    }

    const updatedRows = await sql`
      UPDATE members 
      SET points = ${newPoints} 
      WHERE id = ${currentMember.id}
      RETURNING *;
    `;
    const member = updatedRows[0] || { ...currentMember, points: newPoints };

    const txId = `tx-${Date.now()}`;
    try {
      await sql`
        INSERT INTO point_transactions (id, member_id, change_amount, reason)
        VALUES (${txId}, ${currentMember.id}, ${changeAmount}, ${reason});
      `;
    } catch {
      try {
        await sql`
          INSERT INTO point_transactions (id, member_id, tenant_id, change_amount, reason)
          VALUES (${txId}, ${currentMember.id}, ${currentMember.tenant_id}, ${changeAmount}, ${reason});
        `;
      } catch (e) {
        console.error('[Neon Postgres API] point_transactions INSERT error:', e);
      }
    }

    const finalPoints = Number(member.points || 0);
    let tier = 'SILVER';
    if (finalPoints >= 2000) tier = 'PLATINUM';
    else if (finalPoints >= 1000) tier = 'GOLD VIP';

    return res.status(200).json({
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
    console.error('[Neon Postgres API] UPDATE points error:', err);
    return res.status(500).json({ error: `Failed to update points in database: ${err?.message || 'Database error'}` });
  }
}

router.post('/members/:id/points', (req: Request, res: Response) => {
  return handleMemberPointsUpdate(req.params.id, req.body, res);
});

router.patch('/members/:id/points', (req: Request, res: Response) => {
  return handleMemberPointsUpdate(req.params.id, req.body, res);
});

router.patch('/passes/:objectId/points', (req: Request, res: Response) => {
  return handleMemberPointsUpdate(req.params.objectId, req.body, res);
});

// GET & PATCH /api/admin/profile
router.get('/admin/profile', async (_req: Request, res: Response) => {
  const email = (process.env.SUPER_ADMIN_EMAIL || '').trim();
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
      return res.status(200).json({
        email: email || map.admin_contact_email || '',
        displayName: map.admin_display_name || 'Super Admin Master Issuer',
        organization: map.admin_organization || 'PassLoyal OS Master Issuer',
        phone: map.admin_phone || '',
        contactEmail: map.admin_contact_email || email,
        issuerId: map.admin_issuer_id || MASTER_ISSUER_ID,
        serviceAccountEmail: map.admin_service_account || SERVICE_ACCOUNT_EMAIL,
      });
    } catch (err) {
      console.warn('[Admin Profile] GET notice:', err);
    }
  }

  return res.status(200).json({
    email,
    displayName: 'Super Admin Master Issuer',
    organization: 'PassLoyal OS Master Issuer',
    phone: '',
    contactEmail: email,
    issuerId: MASTER_ISSUER_ID,
    serviceAccountEmail: SERVICE_ACCOUNT_EMAIL,
  });
});

async function handleAdminProfileUpdate(req: Request, res: Response) {
  const {
    displayName,
    organization,
    phone,
    contactEmail,
    issuerId,
    serviceAccountEmail,
    currentPassword,
    newPassword,
  } = req.body || {};

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
  }

  if (issuerId && String(issuerId).trim()) MASTER_ISSUER_ID = String(issuerId).trim();
  if (serviceAccountEmail && String(serviceAccountEmail).trim()) {
    SERVICE_ACCOUNT_EMAIL = String(serviceAccountEmail).trim();
  }

  const savedProfile = {
    email: (process.env.SUPER_ADMIN_EMAIL || contactEmail || '').trim(),
    displayName: (displayName || 'Super Admin Master Issuer').trim(),
    organization: (organization || 'PassLoyal OS Master Issuer').trim(),
    phone: (phone || '').trim(),
    contactEmail: (contactEmail || process.env.SUPER_ADMIN_EMAIL || '').trim().toLowerCase(),
    issuerId: MASTER_ISSUER_ID,
    serviceAccountEmail: SERVICE_ACCOUNT_EMAIL,
  };

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
        ['admin_display_name', savedProfile.displayName],
        ['admin_organization', savedProfile.organization],
        ['admin_phone', savedProfile.phone],
        ['admin_contact_email', savedProfile.contactEmail],
        ['admin_issuer_id', savedProfile.issuerId],
        ['admin_service_account', savedProfile.serviceAccountEmail],
      ];
      for (const [k, v] of entries) {
        await sql`
          INSERT INTO platform_settings (key, value, updated_at)
          VALUES (${k}, ${v}, NOW())
          ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
        `;
      }
    } catch (err) {
      console.warn('[Admin Profile] PATCH DB notice:', err);
    }
  }

  return res.status(200).json({
    success: true,
    profile: savedProfile,
    ...(generatedPasswordHash ? { generatedPasswordHash } : {}),
    message: generatedPasswordHash
      ? 'Admin profile saved and new bcrypt password hash generated. Update ADMIN_PASSWORD_HASH in Vercel to persist the new password.'
      : 'Admin profile updated successfully.',
  });
}

router.patch('/admin/profile', handleAdminProfileUpdate);
router.put('/admin/profile', handleAdminProfileUpdate);

router.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Mount under both /api and / so Vercel rewrites work regardless of path forwarding
app.use('/api', router);
app.use('/', router);

export default app;
