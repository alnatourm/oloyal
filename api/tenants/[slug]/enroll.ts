import crypto from 'crypto';
import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL || '';
const sql = DATABASE_URL ? neon(DATABASE_URL) : null;
const MASTER_ISSUER_ID = process.env.ISSUER_ID || '3388000000022258509';
const SERVICE_ACCOUNT_EMAIL =
  process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || 'oloyal-wallet-sa@banlis-bistro-app.iam.gserviceaccount.com';
const PRIVATE_KEY_PEM = process.env.GOOGLE_PRIVATE_KEY || '';

function normalizeWalletPrivateKey(rawKey?: string): string {
  let k = rawKey || process.env.GOOGLE_PRIVATE_KEY || '';
  k = k.trim().replace(/^"|"$/g, '').replace(/\n/g, '\n').replace(/\\n/g, '\n');

  const hasBegin = k.includes('BEGIN PRIVATE KEY');
  console.log(`[Google Wallet API] private key length: ${k.length}, has BEGIN: ${hasBegin}`);

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
  console.log('[Google Wallet API] Signed JWT with origins:', originsList);

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

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const slug = req.query?.slug || req.query?.params?.slug;
  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  const { name, email, phone } = body;

  let tenant: any = null;

  if (sql && slug) {
    try {
      const rows = await sql`SELECT * FROM tenants WHERE slug = ${slug} OR id = ${slug} LIMIT 1;`;
      if (rows.length > 0) {
        tenant = rows[0];
      }
    } catch (err) {
      console.error('[Neon Postgres API] Find tenant error:', err);
    }
  }

  if (!tenant) {
    tenant = {
      id: 't-banlis',
      slug: slug || 'banlis-bistro',
      name: 'Banlis Bistro & Dining',
      logo: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&auto=format&fit=crop',
      color: '#ff5722',
      archetype: 'loyalty',
      class_id: `${MASTER_ISSUER_ID}.tenant_t-banlis_loyalty_class`,
      issuer_id: MASTER_ISSUER_ID,
    };
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

  try {
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
        console.error('[Neon Postgres API] INSERT member error:', err);
      }
    }

    return res.status(200).json({
      success: true,
      member: {
        id: customerId,
        tenantId: tenant.id,
        name: memberName,
        phone: memberPhone,
        email: memberEmail,
        points: 100,
        googleObjectId: objectId,
      },
      saveToWalletUrl,
    });
  } catch (err: any) {
    console.error('[Enroll Error]:', err);
    return res.status(500).json({ error: err.message || 'Failed to generate pass' });
  }
}
