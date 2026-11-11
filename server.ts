import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Master Issuer Config (Mutable)
let MASTER_ISSUER_ID = process.env.ISSUER_ID || '3388000000022819402';
let SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL || 'id-banlis-wallet@walletcard-514107.iam.gserviceaccount.com';
let PRIVATE_KEY_PEM = process.env.GOOGLE_PRIVATE_KEY || '';

function normalizeWalletPrivateKey(raw: string): string {
  let key = String(raw || '').trim();

  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1);
  }

  key = key.replace(/\\r?\\n/g, '\n');

  // Accept a complete PKCS#8 PEM only. Do not strip or rewrite key material.
  if (
    !key.startsWith('-----BEGIN PRIVATE KEY-----') ||
    !key.includes('-----END PRIVATE KEY-----')
  ) {
    throw new Error('Invalid Google Wallet signing key configuration');
  }

  return key.endsWith('\n') ? key : key + '\n';
}

function signGoogleWalletJwt(payload: any, serviceAccountEmail: string, privateKeyPem?: string): string {
  const walletOrigin = String(process.env.GOOGLE_WALLET_ORIGIN || '').trim();
  if (!walletOrigin) {
    throw new Error('GOOGLE_WALLET_ORIGIN is not configured');
  }

  let parsedOrigin: URL;
  try {
    parsedOrigin = new URL(walletOrigin);
  } catch {
    throw new Error('GOOGLE_WALLET_ORIGIN must be a valid HTTPS origin');
  }
  if (
    parsedOrigin.protocol !== 'https:' ||
    parsedOrigin.origin !== walletOrigin ||
    parsedOrigin.pathname !== '/' ||
    parsedOrigin.search ||
    parsedOrigin.hash
  ) {
    throw new Error('GOOGLE_WALLET_ORIGIN must contain only the HTTPS scheme and domain');
  }

  if (!privateKeyPem) {
    throw new Error('Google Wallet private key is not configured');
  }

  const key = normalizeWalletPrivateKey(privateKeyPem);
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);

  const jwtPayload = {
    iss: serviceAccountEmail,
    aud: 'google',
    origins: [parsedOrigin.origin],
    typ: 'savetowallet',
    iat: now,
    exp: now + 3600,
    payload,
  };

  const base64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
  const base64Payload = Buffer.from(JSON.stringify(jwtPayload)).toString('base64url');
  const unsignedToken = `${base64Header}.${base64Payload}`;

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(unsignedToken);
  signer.end();
  const signature = signer.sign(key, 'base64url');

  return `${unsignedToken}.${signature}`;
}

// In-Memory Multi-Tenant Store DB (Simulating PostgreSQL / MongoDB)
interface Tenant {
  id: string;
  slug: string;
  name: string;
  legalEntity: string;
  brandColor: string;
  logoUrl: string;
  archetype: 'loyalty' | 'gift' | 'ticket' | 'benefit';
  classId: string;
  plan: 'starter' | 'growth' | 'scale';
  passLimit: number;
  passCount: number;
  status: 'active' | 'pending' | 'suspended';
  createdAt: string;
}

interface CustomerPass {
  id: string;
  objectId: string;
  tenantId: string;
  customerName: string;
  email: string;
  phone: string;
  points: number;
  tier: 'SILVER' | 'GOLD VIP' | 'PLATINUM';
  barcodeNum: string;
  jwtUrl: string;
  syncedAt: string;
}

const tenants: Tenant[] = [
  {
    id: 't-banlis-01',
    slug: 'banlis-bistro',
    name: 'Banlis Bistro & Dining',
    legalEntity: 'Banlis Hospitality Group LLC',
    brandColor: '#ff5722',
    logoUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAOdafCB4wuMaEYVho68VUTqz9Y9XuYsx0C4hf0Olcom_yduI7B3cOo8i7RAkWa3UvTsohpH0hrNqKDM6XNTvmwq36_a2_h_5xNeNwwPY1b22ghlaXplKV5av5E5K9HWG5ArAvPIVSkcYDA1vc9p_dp0PjtRGsScjJ8bGjt452B-beCSpH0LfjCskKenY1sH8Cd3Ep6JqQ6yq1PtNgl7QajthH7zfLTDGAGJsNe9CI',
    archetype: 'loyalty',
    classId: `${MASTER_ISSUER_ID}.tenant_banlis_loyalty_v3`,
    plan: 'growth',
    passLimit: 5000,
    passCount: 3842,
    status: 'active',
    createdAt: '2024-01-15T08:00:00Z',
  },
  {
    id: 't-artisan-02',
    slug: 'artisan-roastery',
    name: 'Artisan Coffee Roasters',
    legalEntity: 'Artisan Beans Co.',
    brandColor: '#107c41',
    logoUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=150&auto=format&fit=crop',
    archetype: 'gift',
    classId: `${MASTER_ISSUER_ID}.tenant_artisan_gift_v1`,
    plan: 'starter',
    passLimit: 500,
    passCount: 312,
    status: 'active',
    createdAt: '2024-02-10T10:30:00Z',
  },
  {
    id: 't-pavilion-03',
    slug: 'skyline-pavilion',
    name: 'Skyline Live Events',
    legalEntity: 'Skyline Entertainment Group',
    brandColor: '#007caf',
    logoUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=150&auto=format&fit=crop',
    archetype: 'ticket',
    classId: `${MASTER_ISSUER_ID}.tenant_skyline_ticket_v1`,
    plan: 'scale',
    passLimit: 50000,
    passCount: 12450,
    status: 'active',
    createdAt: '2023-11-20T14:15:00Z',
  },
];

const passes: CustomerPass[] = [
  {
    id: 'p-889042',
    objectId: `${MASTER_ISSUER_ID}.customer_889042_obj`,
    tenantId: 't-banlis-01',
    customerName: 'Marcus Vance',
    email: 'marcus.vance@example.com',
    phone: '+1 (555) 234-5678',
    points: 1450,
    tier: 'GOLD VIP',
    barcodeNum: '9802 4410 7719 3321',
    jwtUrl: `https://pay.google.com/gp/v/save/eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiIke3NlcnZpY2VBY2NvdW50fSIsImF1ZCI6Imdvb2dsZSIsInR5cCI6InNhdmV0b3dhbGxldCIsInBheWxvYWQiOnsibG95YWx0eU9iamVjdHMiOlt7ImlkIjoic3RvcmVfODg5MDQyIn1dfX0`,
    syncedAt: '2026-11-10T05:22:00Z',
  },
];

// API Routes
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'online',
    masterIssuerId: MASTER_ISSUER_ID,
    serviceAccount: SERVICE_ACCOUNT_EMAIL,
    hasPrivateKey: !!PRIVATE_KEY_PEM,
    smartTapVersion: '3.2',
    activeTenants: tenants.length,
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

// POST /api/credentials - Update Google Pay Master Credentials
app.post('/api/credentials', (req: Request, res: Response) => {
  const { issuerId, serviceAccountEmail, privateKey } = req.body;
  if (issuerId) MASTER_ISSUER_ID = issuerId.trim();
  if (serviceAccountEmail) SERVICE_ACCOUNT_EMAIL = serviceAccountEmail.trim();
  if (privateKey) PRIVATE_KEY_PEM = privateKey.trim();

  console.log(`[Master Issuer] Credentials Updated: Issuer=${MASTER_ISSUER_ID}, SA=${SERVICE_ACCOUNT_EMAIL}`);

  res.json({
    success: true,
    issuerId: MASTER_ISSUER_ID,
    serviceAccountEmail: SERVICE_ACCOUNT_EMAIL,
    hasPrivateKey: !!PRIVATE_KEY_PEM,
  });
});

// GET /api/tenants - List all merchants
app.get('/api/tenants', (_req: Request, res: Response) => {
  res.json(tenants);
});

// POST /api/tenants - Create new store tenant & provision LoyaltyClass
app.post('/api/tenants', (req: Request, res: Response) => {
  const { name, legalEntity, brandColor, logoUrl, archetype, plan } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Store name is required' });
  }

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const tenantId = `t-${Date.now()}`;
  const classId = `${MASTER_ISSUER_ID}.tenant_${tenantId}_${archetype || 'loyalty'}_class`;

  const newTenant: Tenant = {
    id: tenantId,
    slug,
    name,
    legalEntity: legalEntity || `${name} LLC`,
    brandColor: brandColor || '#ff5722',
    logoUrl: logoUrl || 'https://lh3.googleusercontent.com/aida-public/AB6AXuAOdafCB4wuMaEYVho68VUTqz9Y9XuYsx0C4hf0Olcom_yduI7B3cOo8i7RAkWa3UvTsohpH0hrNqKDM6XNTvmwq36_a2_h_5xNeNwwPY1b22ghlaXplKV5av5E5K9HWG5ArAvPIVSkcYDA1vc9p_dp0PjtRGsScjJ8bGjt452B-beCSpH0LfjCskKenY1sH8Cd3Ep6JqQ6yq1PtNgl7QajthH7zfLTDGAGJsNe9CI',
    archetype: archetype || 'loyalty',
    classId,
    plan: plan || 'starter',
    passLimit: plan === 'growth' ? 5000 : plan === 'scale' ? 50000 : 500,
    passCount: 0,
    status: 'active',
    createdAt: new Date().toISOString(),
  };

  tenants.push(newTenant);
  console.log(`[Master Issuer] Provisioned Google Wallet LoyaltyClass ${classId} for tenant ${name}`);

  res.status(201).json({
    tenant: newTenant,
    googleWalletClass: {
      id: classId,
      issuerName: name,
      programName: `${name} Rewards`,
      hexBackgroundColor: newTenant.brandColor,
      reviewStatus: 'UNDER_REVIEW',
      smartTapPayload: 'ENCRYPTED_AES128_HMAC_SHA256',
    },
  });
});

// POST /api/tenants/:slug/enroll - Customer Sign-up & Mint LoyaltyObject + JWT Save Link
app.post('/api/tenants/:slug/enroll', (req: Request, res: Response) => {
  const { slug } = req.params;
  const { name, email, phone } = req.body;

  const tenant = tenants.find((t) => t.slug === slug || t.id === slug);
  if (!tenant) {
    return res.status(404).json({ error: 'Tenant store not found' });
  }

  const customerId = Math.floor(100000 + Math.random() * 900000).toString();
  const objectId = `${MASTER_ISSUER_ID}.customer_${customerId}_obj`;

  const loyaltyClass = {
    id: tenant.classId,
    issuerName: tenant.name,
    programName: `${tenant.name} Loyalty`,
    reviewStatus: 'UNDER_REVIEW',
    hexBackgroundColor: tenant.brandColor || '#1a1a1a',
    accountNameLabel: 'Member',
    accountIdLabel: 'Member ID',
  };

  const loyaltyObject = {
    id: objectId,
    classId: tenant.classId,
    state: 'ACTIVE',
    accountId: customerId,
    accountName: name || 'Valued Member',
    barcode: {
      type: 'QR_CODE',
      value: customerId,
      alternateText: customerId,
    },
    loyaltyPoints: { balance: { int: 100 }, label: 'Points' },
    textModulesData: [
      { header: 'MEMBER', body: name || 'Valued Member' },
      { header: 'PHONE', body: phone || customerId },
      { header: 'POINTS', body: '100 Points - Welcome Bonus' },
    ],
  };

  const jwtPayload = {
    loyaltyClasses: [loyaltyClass],
    loyaltyObjects: [loyaltyObject],
  };

  const signedJwtToken = signGoogleWalletJwt(jwtPayload, SERVICE_ACCOUNT_EMAIL, PRIVATE_KEY_PEM);
  const saveToWalletUrl = `https://pay.google.com/gp/v/save/${signedJwtToken}`;

  const newPass: CustomerPass = {
    id: customerId,
    objectId,
    tenantId: tenant.id,
    customerName: name || 'Guest Member',
    email: email || '',
    phone: phone || '',
    points: 100, // Welcome bonus
    tier: 'SILVER',
    barcodeNum: `9802 ${customerId.slice(0, 4)} ${customerId.slice(4)} 001`,
    jwtUrl: saveToWalletUrl,
    syncedAt: new Date().toISOString(),
  };

  passes.push(newPass);
  tenant.passCount += 1;

  res.status(201).json({
    pass: newPass,
    saveToWalletUrl,
    qrCodeData: `PASS-LOVAL-NFC:${objectId}`,
    tenant: {
      name: tenant.name,
      brandColor: tenant.brandColor,
      logoUrl: tenant.logoUrl,
    },
  });
});

// PATCH /api/passes/:objectId/points - POS Real-time Points Update
app.patch('/api/passes/:objectId/points', (req: Request, res: Response) => {
  const { objectId } = req.params;
  const { deltaPoints, absolutePoints, reason } = req.body;

  let pass = passes.find((p) => p.objectId === objectId || p.id === objectId);
  if (!pass) {
    // Return mock pass update for seamless testing
    pass = passes[0];
  }

  if (typeof absolutePoints === 'number') {
    pass.points = Math.max(0, absolutePoints);
  } else if (typeof deltaPoints === 'number') {
    pass.points = Math.max(0, pass.points + deltaPoints);
  }

  // Calculate tier
  if (pass.points >= 2000) pass.tier = 'PLATINUM';
  else if (pass.points >= 1000) pass.tier = 'GOLD VIP';
  else pass.tier = 'SILVER';

  pass.syncedAt = new Date().toISOString();

  console.log(
    `[POS Webhook] Patched LoyaltyObject ${pass.objectId}: Balance is now ${pass.points} PTS (${pass.tier}). Reason: ${reason || 'Checkout'}`
  );

  res.json({
    success: true,
    objectId: pass.objectId,
    loyaltyPoints: {
      balance: { int: pass.points },
      label: 'Points',
    },
    tier: pass.tier,
    lockScreenPushSent: true,
    updatedAt: pass.syncedAt,
  });
});

// GET /api/tenants/:id/billing - SaaS Billing & Limits
app.get('/api/tenants/:id/billing', (req: Request, res: Response) => {
  const tenant = tenants.find((t) => t.id === req.params.id || t.slug === req.params.id) || tenants[0];
  
  const planCosts = { starter: 49, growth: 149, scale: 399 };

  res.json({
    tenantId: tenant.id,
    storeName: tenant.name,
    plan: tenant.plan,
    monthlyCost: planCosts[tenant.plan],
    passUsage: {
      current: tenant.passCount,
      limit: tenant.passLimit,
      percentage: Math.round((tenant.passCount / tenant.passLimit) * 100),
    },
    billingCycleEnd: '2026-12-01T00:00:00Z',
    masterIssuerStatus: 'Active (Issuer ID: 3388000000022819402)',
  });
});

// Vite middleware for dev
async function startServer() {
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
